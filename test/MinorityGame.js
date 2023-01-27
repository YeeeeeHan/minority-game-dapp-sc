const {expect} = require("chai");
const {loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
// const dotenv = require('dotenv')
// dotenv.config()


const ticketPriceGwei = process.env.TICKET_PRICE_GWEI
console.log('@@@@@@', ticketPriceGwei)
const ticketPriceWei = ethers.utils.parseUnits(ticketPriceGwei.toString(), "gwei")
const gasDiscrepWei = 500000000000000 // 0.0005 eth
const InitialBalance = 10000000000000000000000 // 10000 eth


async function voteFunc(contractInstance, msgValueGwei, addr, option, unix, salt) {
    const ticketPriceEth = ethers.utils.formatUnits(msgValueGwei, "gwei")
    const voteHash = await contractInstance.connect(addr).hasher(addr.address, option, unix, salt)
    await contractInstance.connect(addr).vote(voteHash, {
        from: addr.address,
        value: ethers.utils.parseEther(ticketPriceEth)
    })

    return voteHash
}

describe("Token contract", function () {
    async function deployContractFixture() {
        // Get the ContractFactory and Signers here.
        const Contract = await ethers.getContractFactory("MinorityGame");
        const [owner, addr1, addr2] = await ethers.getSigners();

        const contractInstance = await Contract.deploy(ticketPriceGwei);

        await contractInstance.deployed();

        // Fixtures can return anything you consider useful for your tests
        return {Contract, contractInstance, owner, addr1, addr2};
    }

    describe("Deployment", function () {
        it("Should set the right gameMaster", async function () {
            const {contractInstance, owner} = await loadFixture(deployContractFixture);
            expect(await contractInstance.gameMaster()).to.equal(owner.address);
        });

        it("Should set the right ticketPrice", async function () {
            const {contractInstance} = await loadFixture(deployContractFixture);
            expect(await contractInstance.ticketPrice()).to.equal(ticketPriceGwei);
        });

        it("Should set Qid = 1", async function () {
            const {contractInstance} = await loadFixture(deployContractFixture);
            expect(await contractInstance.qid()).to.equal(1);
        });

        it("Should not have any initial players", async function () {
            const {contractInstance} = await loadFixture(deployContractFixture);
            expect(await contractInstance.getPlayersNumber()).to.equal(0);
        });

        it("Should not have any initial balance", async function () {
            const {contractInstance} = await loadFixture(deployContractFixture);
            expect(await contractInstance.getBalance()).to.equal(0);
        });
    });

    describe("Modifiers", function () {
        it("onlyGameMaster should only allow game master to call", async function () {
            const {contractInstance, addr1} = await loadFixture(deployContractFixture);
            await expect(contractInstance.connect(addr1).emergencyRepay()).to.be.revertedWith('Only GameMaster can call this function');
        });

        it("resetContractState should increase qid", async function () {
            const {contractInstance, owner} = await loadFixture(deployContractFixture);
            expect(await contractInstance.qid()).to.equal(1);
            await contractInstance.connect(owner).emergencyRepay()
            expect(await contractInstance.qid()).to.equal(2);
        });
    });

    describe("Casting votes", function () {
        it("Hasher should return consistent result", async function () {
            const {contractInstance, addr1} = await loadFixture(deployContractFixture);
            expect(await contractInstance.connect(addr1).hasher(addr1.address, 0, 10000, "salt")).to.equal("0x295e80e9dc5f553e811c0d96a1189ae9839125bac940c95f83af97b0ea6a40ae");
        });

        it("Vote should revert if message value != ticket price", async function () {
            const {contractInstance, addr1} = await loadFixture(deployContractFixture);
            const addr1_vote_hash = await contractInstance.connect(addr1).hasher(addr1.address, 0, 10000, "salt")
            // Call vote with insufficient message value
            const ticketPriceEth = ethers.utils.formatUnits(ticketPriceGwei - 1, "gwei")

            // Expect calling vote function to revert
            await expect(contractInstance.connect(addr1).vote(addr1_vote_hash, {
                from: addr1.address,
                value: ethers.utils.parseEther(ticketPriceEth)
            })).to.be.revertedWith('msg.value does not equal ticketPrice');
        });

        it("Vote should revert if it is duplicate", async function () {
            const {contractInstance, addr1} = await loadFixture(deployContractFixture);

            // Vote once
            const addr1_vote_hash = await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10000, "salt")

            // Expect calling vote function to revert when vote is duplicate
            const ticketPriceEth = ethers.utils.formatUnits(ticketPriceGwei, "gwei")
            await expect(contractInstance.connect(addr1).vote(addr1_vote_hash, {
                from: addr1.address,
                value: ethers.utils.parseEther(ticketPriceEth)
            })).to.be.revertedWith('vote already exists');
        });

        it("Vote should add voter to players array, and add hash to commitHash", async function () {
            const {contractInstance, addr1, addr2} = await loadFixture(deployContractFixture);

            // ---- Voting option 0 ----
            const addr1InitialBalanceWei = await addr1.getBalance()
            const addr1_vote_hash = await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10000, "salt")

            // Expect addr1 balance to reduce
            const addr1FinalBalanceWei = await addr1.getBalance()
            expect(addr1InitialBalanceWei.sub(addr1FinalBalanceWei).sub(ticketPriceWei)).to.be.above(0)

            // Expect 1 player
            expect(await contractInstance.connect(addr1).getPlayersNumber()).to.be.equal(1);
            let contractBalanceInWei = await contractInstance.connect(addr1).getBalance()

            // Expect correct contract balance
            expect(contractBalanceInWei).to.be.equal(ticketPriceWei);

            // Expect hash added to commitHash
            expect(await contractInstance.connect(addr1).commitMap(addr1_vote_hash)).to.be.true;


            // ---- Voting option 1 ----
            const addr2InitialBalanceWei = await addr2.getBalance()
            const addr2_vote_hash = await voteFunc(contractInstance, ticketPriceGwei, addr2, 1, 10000, "salt")

            // Expect addr2 balance to reduce
            const addr2FinalBalanceWei = await addr2.getBalance()
            expect(addr2InitialBalanceWei.sub(addr2FinalBalanceWei).sub(ticketPriceWei)).to.be.above(0)

            // Expect 2 players
            expect(await contractInstance.connect(addr2).getPlayersNumber()).to.be.equal(2);
            contractBalanceInWei = await contractInstance.connect(addr2).getBalance()

            // Expect correct contract balance
            expect(contractBalanceInWei).to.be.equal((ticketPriceWei * 2).toString());

            // Expect hash added to commitHash
            expect(await contractInstance.connect(addr2).commitMap(addr2_vote_hash)).to.be.true;
        });
    });

    describe("Emergency repay", function () {
        it("Repay after: addr1 votes 2 times for opt0, addr2 votes 1 time for opt1", async function () {
            const {contractInstance, owner, addr1, addr2} = await loadFixture(deployContractFixture);

            // addr1 vote, expect addr1 balance to reduce
            const addr1InitialBalanceWei = await addr1.getBalance()
            const addr1_vote_hash1 = await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10000, "salt")
            const addr1_vote_hash2 = await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10001, "salt")
            const addr1FinalBalanceWei = await addr1.getBalance()
            expect(addr1InitialBalanceWei.sub(addr1FinalBalanceWei).sub(ticketPriceWei.mul(2))).to.be.above(0)

            // addr2 vote, expect addr2 balance to reduce
            const addr2InitialBalanceWei = await addr2.getBalance()
            const addr2_vote_hash = await voteFunc(contractInstance, ticketPriceGwei, addr2, 1, 10000, "salt")
            const addr2FinalBalanceWei = await addr2.getBalance()
            expect(addr2InitialBalanceWei.sub(addr2FinalBalanceWei).sub(ticketPriceWei)).to.be.above(0)

            // Call emergency repay
            await contractInstance.connect(owner).emergencyRepay()

            // Expect addr1 to receive refund
            const addr1RefundedBalanceWei = await addr1.getBalance()
            expect(addr1RefundedBalanceWei).to.be.equal(addr1FinalBalanceWei.add(ticketPriceWei.mul(2)))

            // Expect addr2 to receive refund
            const addr2RefundedBalanceWei = await addr2.getBalance()
            expect(addr2RefundedBalanceWei).to.be.equal(addr2FinalBalanceWei.add(ticketPriceWei))

            // Expect contract state to be reset
            expect(await contractInstance.qid()).to.equal(2);
            expect(await contractInstance.getPlayersNumber()).to.equal(0)
        });
    });

    describe("Reveal", function () {
        it("players.length != votes.length", async function () {
            const {contractInstance, owner, addr1, addr2} = await loadFixture(deployContractFixture);
            const addr1InitialBalanceWei = await addr1.getBalance()
            const addr2InitialBalanceWei = await addr2.getBalance()

            await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10000, "salt")
            await voteFunc(contractInstance, ticketPriceGwei, addr2, 1, 10000, "salt")

            // Distribute prize with invalid votes array
            await contractInstance.connect(owner).reveal([[addr1.address, 0, 10000, "salt"]])

            // Emergency repay - all players get back their funds
            const addr1FinalBalanceWei = await addr1.getBalance()
            const addr2FinalBalanceWei = await addr2.getBalance()
            expect(addr1FinalBalanceWei).to.be.above(addr1InitialBalanceWei.sub(gasDiscrepWei))
            expect(addr2FinalBalanceWei).to.be.above(addr2InitialBalanceWei.sub(gasDiscrepWei))
        });

        it("Unexpected vote data", async function () {
            const {contractInstance, owner, addr1, addr2} = await loadFixture(deployContractFixture);
            const addr1InitialBalanceWei = await addr1.getBalance()

            await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10000, "salt")

            // Distribute prize with invalid votes array
            await contractInstance.connect(owner).reveal([[addr1.address, 2, 10000, "salt"]])

            // Emergency repay - all players get back their funds
            const addr1FinalBalanceWei = await addr1.getBalance()
            expect(addr1FinalBalanceWei).to.be.above(addr1InitialBalanceWei.sub(gasDiscrepWei))
        });

        it("1 - Commit hash in votes array inconsistent with hash in commitMap", async function () {
            const {contractInstance, owner, addr1, addr2} = await loadFixture(deployContractFixture);
            const addr1InitialBalanceWei = await addr1.getBalance()

            await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10000, "salt")

            // Distribute prize with invalid votes array
            await contractInstance.connect(owner).reveal([[addr1.address, 0, 99999, "salt"]])

            // Emergency repay - all players get back their funds
            const addr1FinalBalanceWei = await addr1.getBalance()
            expect(addr1FinalBalanceWei).to.be.above(addr1InitialBalanceWei.sub(gasDiscrepWei))
        });

        it("2 - Commit hash in votes array inconsistent with hash in commitMap", async function () {
            const {contractInstance, owner, addr1, addr2} = await loadFixture(deployContractFixture);
            const addr1InitialBalanceWei = await addr1.getBalance()

            await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10000, "salt")

            // Distribute prize with invalid votes array
            await contractInstance.connect(owner).reveal([[addr1.address, 0, 10000, "wrongsalt"]])

            // Emergency repay - all players get back their funds
            const addr1FinalBalanceWei = await addr1.getBalance()
            expect(addr1FinalBalanceWei).to.be.above(addr1InitialBalanceWei.sub(gasDiscrepWei))
        });

        it("No winners", async function () {
            const {contractInstance, owner, addr1, addr2} = await loadFixture(deployContractFixture);
            const addr1InitialBalanceWei = await addr1.getBalance()

            await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10000, "salt")
            await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10001, "salt")

            // Distribute prize with invalid votes array
            await contractInstance.connect(owner).reveal([[addr1.address, 0, 10000, "salt"], [addr1.address, 0, 10001, "salt"]])

            // Emergency repay - all players get back their funds
            const addr1FinalBalanceWei = await addr1.getBalance()
            expect(addr1FinalBalanceWei).to.be.above(addr1InitialBalanceWei.sub(gasDiscrepWei))
        });

        it("Opt 1 wins", async function () {
            const {contractInstance, owner, addr1, addr2} = await loadFixture(deployContractFixture);
            const ownerInitialBalanceWei = await owner.getBalance()
            const addr2InitialBalanceWei = await addr2.getBalance()

            await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10000, "salt")
            await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10001, "salt")
            await voteFunc(contractInstance, ticketPriceGwei, addr2, 1, 10000, "salt")

            // Expect contract to have 3 tickets worth of eth
            const contractBalance = await contractInstance.getBalance()
            expect(contractBalance).to.be.equal(ticketPriceWei.mul(3))

            // Distribute prize
            await contractInstance.connect(owner).reveal([[addr1.address, 0, 10000, "salt"],[addr1.address, 0, 10001, "salt"],[addr2.address, 1, 10000, "salt"]])

            // Expect contract to not have any eth
            expect(await contractInstance.getBalance()).to.be.equal(0)

            // Expect owner to receive commission 5% comission
            const ownerFinalBalanceWei = await owner.getBalance()
            const actualComms = await ownerFinalBalanceWei.sub(ownerInitialBalanceWei)
            const expectedComms = await contractBalance.mul(5).div(100).sub(gasDiscrepWei)
            expect(actualComms).to.be.above(expectedComms)

            // Expect winner to receive rewards
            const addr2FinalBalanceWei = await addr2.getBalance()
            const actualReward = await addr2FinalBalanceWei.sub(addr2InitialBalanceWei)
            const expectedReward = await contractBalance.sub(ticketPriceWei).sub(actualComms).sub(gasDiscrepWei)
            expect(actualReward).to.be.above(expectedReward)


            // Expect contract state to be reset
            expect(await contractInstance.qid()).to.equal(2);
            expect(await contractInstance.getPlayersNumber()).to.equal(0)
        });

        it("Opt 0 wins", async function () {
            const {contractInstance, owner, addr1, addr2} = await loadFixture(deployContractFixture);
            const ownerInitialBalanceWei = await owner.getBalance()

            await voteFunc(contractInstance, ticketPriceGwei, addr1, 0, 10000, "salt")
            await voteFunc(contractInstance, ticketPriceGwei, addr2, 1, 10000, "salt")
            await voteFunc(contractInstance, ticketPriceGwei, addr2, 1, 10001, "salt")

            // Expect contract to have 3 tickets worth of eth
            const contractBalance = await contractInstance.getBalance()
            expect(contractBalance).to.be.equal(ticketPriceWei.mul(3))

            // Distribute prize
            await contractInstance.connect(owner).reveal([[addr1.address, 0, 10000, "salt"],[addr2.address, 1, 10000, "salt"],[addr2.address, 1, 10001, "salt"]])

            // Expect contract to not have any eth
            expect(await contractInstance.getBalance()).to.be.equal(0)

            // Expect owner to receive commission 5% comission
            const ownerFinalBalanceWei = await owner.getBalance()
            const actualComms = await ownerFinalBalanceWei.sub(ownerInitialBalanceWei)
            const expectedComms = await contractBalance.mul(5).div(100).sub(gasDiscrepWei)
            expect(actualComms).to.be.above(expectedComms)

            // Expect contract state to be reset
            expect(await contractInstance.qid()).to.equal(2);
            expect(await contractInstance.getPlayersNumber()).to.equal(0)
        });
    });
});


