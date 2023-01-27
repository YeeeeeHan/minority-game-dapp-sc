// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.15;

/**
 * Smart Contract
 *
 * @author limyeechern
 * @author limyeehan
 */

import "hardhat/console.sol";


contract MinorityGame {
    address payable public gameMaster;
    uint public ticketPrice;                        // Price of vote
    mapping(bytes32 => bool) public commitMap;      // Used for commit-reveal scheme to verify while masking players' votes
    address payable[] public players;               // Players who participated in the game
    address payable[] opt0;                          // Players who voted option 0
    address payable[] opt1;                          // Players who voted option 1
    uint public qid;
    // uint private ticketLimit;

    struct Vote {
        address _address;
        uint option;
        uint unix;
        string salt;
    }

    // Initialising variables
    constructor (uint _ticketPrice){
        gameMaster = payable(msg.sender);
        // Vote limits
        // ticketLimit = 5;
        ticketPrice = _ticketPrice;
        qid = 1;
    }

    modifier onlyGameMaster() {
        require(msg.sender == gameMaster, 'Only GameMaster can call this function');
        _;
    }

    modifier resetContractState(){
        _;
        players = new address payable[](0);
        opt0 = new address payable[](0);
        opt1 = new address payable[](0);
        qid += 1;
    }

    // Vote is called by participants to commit their votes (and pay)
    function vote(bytes32 commitHash) public payable {
        //ticket price equals to amount entered
        require(msg.value == ticketPrice * 1 gwei, 'msg.value does not equal ticketPrice');

        // Push all player addresses to players[] for emergencyRepay
        players.push(payable(msg.sender));

        // Check if commitHash is already in commitMap
        require(commitMap[commitHash] == false, 'vote already exists');

        // Add commitHash to commitMap
        commitMap[commitHash] = true;
    }

    // Revert function that is called when game fails for any reason
    function emergencyRepay() public payable onlyGameMaster resetContractState {
        for (uint i; i < players.length; i++) {
            players[i].transfer(ticketPrice * 1 gwei);
        }
        return;
    }

    // Ends the game
    // 1. Check length of players = length of votes
    // 2. Double check votes sent in from backend against the commitMap
    // 3. If there are no discrepancies, proceed to distribute prize
    function reveal(Vote[] memory votes) payable onlyGameMaster external resetContractState {
        // First check - length of players
        if (players.length != votes.length) {
            console.log("[DEBUG reveal] Number of votes != number of players, emergency repay");
            emergencyRepay();
            return;
        }

        for (uint i; i < votes.length; i++) {
            // Build opt0 and opt1 and emergencyRepay on unexpected vote data
            if (votes[i].option == 0) {
                opt0.push(payable(votes[i]._address));
            }
            else if (votes[i].option == 1) {
                opt1.push(payable(votes[i]._address));
            }
            else {
                console.log("[DEBUG reveal] Unexpected vote data, emergency repay");
                emergencyRepay();
                return;
            }

            // Hash all voter information and double check if data has not been tampered with
            bytes32 _hash = hasher(votes[i]._address, votes[i].option, votes[i].unix, votes[i].salt);

            // Check if present in commitMap
            if (commitMap[_hash] != true) {
                console.log("[DEBUG reveal] Commit hash not found, emergency repay");
                // Fault in commit-reveal scheme
                emergencyRepay();
                return;

            }
        }


        // Option 1 is the minority, payout to players that chose option 1
        if (opt0.length > opt1.length) {
            console.log("[DEBUG reveal] opt1 wins", opt0.length, opt1.length);
            distributePrize(opt1);
        }
        // Option 0 is the minority, payout to players that chose option 0
        else if (opt0.length < opt1.length) {
            console.log("[DEBUG reveal] opt0 wins", opt0.length, opt1.length);
            distributePrize(opt0);
        }
        else {
            console.log("[DEBUG reveal] neither op0 nor op1 wins, emergency repay");
            emergencyRepay();
            return;
        }
        return;
    }


    // When distributePrize is called, winning amount is distributed to each minority winner that
    // is passed into the function.
    function distributePrize(address payable[] memory winners) internal onlyGameMaster {
        // Only have votes for 1 option
        if (winners.length == 0) {
            console.log("[DEBUG distributePrize] No winners");
            emergencyRepay();
            return;
        }

        // GameMaster earnings
        uint commission = address(this).balance * 5 / 100;
        gameMaster.transfer(commission);

        uint winningAmount = (address(this).balance) / winners.length;
        console.log("[DEBUG distributePrize] winningAmount: %s", winningAmount);

        for (uint i; i < winners.length; i++) {
            winners[i].transfer(winningAmount);
        }
        return;
    }

    // Hashing function that hashes address, option and salt
    function hasher(address add, uint option, uint unix, string memory salt) public pure returns (bytes32){
        return keccak256(abi.encodePacked(add, option, unix, salt));
    }

    // Return the number of players participating
    function getPlayersNumber() view public returns (uint256){
        return players.length;
    }

    // Return contract balance
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
}