const { expect } = require("chai");
const {
	ethers: {
		getContract,
		provider: { getBlock },
		getNamedSigners,
		utils: { parseEther },
		BigNumber,
		constants
	},
	deployments: { fixture, createFixture },
	network
} = require("hardhat");


const setupFixture = createFixture(async () => {
	await fixture(["Hardhat"]);

	const vesting = await getContract("Vesting");

	return vesting;
});

describe("Vesting contract: ", function () {
	let deployer, caller, vesting;

	before("Before All: ", async function () {
		({ deployer, caller } = await getNamedSigners());

	});

	beforeEach(async function () {
		vesting = await setupFixture();

		await caller.sendTransaction({ to: vesting.address, value: parseEther("10") });
	});

	xdescribe("computeScheduleIdForAddressAndIndex function: ", function () {
		it("Should count id: ", async function () {
			// const index = await vesting.getUserVestingCount(caller.address);
			// console.log(index);
			// const id = web3.utils.keccak256(web3.eth.abi.encodeParameters(["address", "uint256"], [caller.address, index]));
			// // const id = Web3.eth.abi.encodeParameters(["address", "uint256"], [caller.address, index]);
			// expect(await vesting.nextSchedulerIdForHolder(caller.address)).to.eq(id);
		});
	});

	describe("Vest function: ", function () {
		it("Should vest some eth: ", async function () {
			const receiver = caller.address;
			const cliff = 100;
			const totalPeriods = 100;
			const timePerPeriod = 1000;

			const id = await vesting.nextSchedulerIdForHolder(receiver);

			const tx = await vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			);

			const schedule = await vesting.getVestingSchedule(id);

			expect(schedule.receiver).to.eq(receiver);
			expect(schedule.startTime).to.eq((await getBlock(tx.blockNumber)).timestamp);
			expect(schedule.cliff).to.eq(cliff);
			expect(schedule.totalPeriods).to.eq(totalPeriods);
			expect(schedule.amount).to.eq(parseEther("1"));
			expect(schedule.claimedFunds).to.eq(BigNumber.from("0"));
			expect(schedule.initialized).to.eq(true);
		});

		it("Should correct transfer funds: ", async function () {
			const receiver = caller.address;
			const startTime = new Date().getTime();
			const cliff = startTime + 100;
			const totalPeriods = 100;
			const timePerPeriod = 1000;

			await expect(() => vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			)).to.changeEtherBalances([caller, vesting], [parseEther("-1"), parseEther("1")]);
		});

		it("Should reverte with \"Vesting: You can't vest 0 funds\": ", async function () {
			const receiver = caller.address;
			const startTime = new Date().getTime();
			const cliff = startTime + 100;
			const totalPeriods = 100;
			const timePerPeriod = 1000;

			await expect(vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("0")
				}
			)).to.revertedWith("Vesting: You can't vest 0 funds");
		});

		it("Should emit VestingFunded with correct params: ", async function () {
			const receiver = caller.address;
			const startTime = new Date().getTime();
			const cliff = startTime + 100;
			const totalPeriods = 100;
			const timePerPeriod = 1000;

			await expect(vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			))
				.to
				.emit(vesting, "VestingFunded")
				.withArgs(receiver, parseEther("1"));
		});
	});

	describe("ClaimFunds function:", function () {
		it("Sould claim some funds: ", async function () {
			const receiver = caller.address;
			const cliff = 10;
			const totalPeriods = BigNumber.from(100);
			const timePerPeriod = BigNumber.from(10000);

			const id = await vesting.nextSchedulerIdForHolder(receiver);

			const tx = await vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			);
			const startTime = (await getBlock(tx.blockNumber)).timestamp;

			await network.provider.send("evm_increaseTime", [15000]);
			await network.provider.send("evm_mine");

			const schedule = await vesting.getVestingSchedule(id);
			const currenntTime = (await getBlock(id.blockNumber)).timestamp;

			const amount = schedule.amount;
			const passedTime = BigNumber.from(currenntTime - startTime);
			const claimedFunds = schedule.claimedFunds;
			const fundsToClaim = (amount.div(totalPeriods.mul(passedTime.div(timePerPeriod)))).sub(claimedFunds);

			await expect(() => vesting.connect(caller).claimFunds(id))
				.to
				.changeTokenBalance(vesting, caller, fundsToClaim);

		});

		it("Should reverte with \"Vesting: only receiver can claim funds\": ", async function () {
			const receiver = caller.address;
			const cliff = 10;
			const totalPeriods = BigNumber.from(100);
			const timePerPeriod = BigNumber.from(10000);

			const id = await vesting.nextSchedulerIdForHolder(receiver);
			await vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			);

			await network.provider.send("evm_increaseTime", [15000]);
			await network.provider.send("evm_mine");

			await expect(vesting.connect(deployer).claimFunds(id))
				.to
				.revertedWith("Vesting: only receiver can claim funds");

		});

		it("Should reverte with \"Vesting: Schedule must be initialized\": ", async function () {
			const receiver = caller.address;
			const cliff = 10;
			const totalPeriods = BigNumber.from(1);
			const timePerPeriod = BigNumber.from(10000);

			const id = await vesting.nextSchedulerIdForHolder(receiver);
			await vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			);

			await network.provider.send("evm_increaseTime", [10000]);
			await network.provider.send("evm_mine");

			await vesting.connect(caller).withdraw(id, await vesting.balanceOf(caller.address));

			await expect(vesting.connect(caller).claimFunds(id))
				.to
				.revertedWith("Vesting: Schedule must be initialized");
		});

		it("Should reverte with \"Vesting: vesting hasn't started yet\": ", async function () {
			const receiver = caller.address;
			const cliff = 10;
			const totalPeriods = BigNumber.from(100);
			const timePerPeriod = BigNumber.from(10000);

			const id = await vesting.nextSchedulerIdForHolder(receiver);
			await vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			);



			await expect(vesting.connect(caller).claimFunds(id))
				.to
				.revertedWith("Vesting: vesting hasn't started yet");
		});

		it("Should emit Claimed event with correct args: ", async function () {
			const receiver = caller.address;
			const cliff = 10;
			const totalPeriods = BigNumber.from(100);
			const timePerPeriod = BigNumber.from(10000);

			const id = await vesting.nextSchedulerIdForHolder(receiver);

			const tx = await vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			);
			const startTime = (await getBlock(tx.blockNumber)).timestamp;

			await network.provider.send("evm_increaseTime", [15000]);
			await network.provider.send("evm_mine");

			const schedule = await vesting.getVestingSchedule(id);
			const currenntTime = (await getBlock(id.blockNumber)).timestamp;

			const amount = schedule.amount;
			const passedTime = BigNumber.from(currenntTime - startTime);
			const claimedFunds = schedule.claimedFunds;
			const fundsToClaim = (amount.div(totalPeriods.mul(passedTime.div(timePerPeriod)))).sub(claimedFunds);

			await expect(vesting.connect(caller).claimFunds(id))
				.to
				.emit(vesting, "Claimed")
				.withArgs(receiver, fundsToClaim);
		});
	});

	describe("Withdraw function: ", function () {
		it("Should withdraw some funds(check eth transfer): ", async function () {
			const receiver = caller.address;
			const cliff = 10;
			const totalPeriods = BigNumber.from(1);
			const timePerPeriod = BigNumber.from(10000);

			const id = await vesting.nextSchedulerIdForHolder(receiver);
			await vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			);

			await network.provider.send("evm_increaseTime", [15000]);
			await network.provider.send("evm_mine");

			await vesting.connect(caller).claimFunds(id);


			const amount = await vesting.balanceOf(caller.address);

			await expect(() => vesting.connect(caller).withdraw(
				id,
				amount
			)).to.changeEtherBalances([caller, vesting], [amount, amount.mul(constants.NegativeOne)]);
		});

		it("Should withdraw some funds(check token burn): ", async function () {
			const receiver = caller.address;
			const cliff = 10;
			const totalPeriods = BigNumber.from(1);
			const timePerPeriod = BigNumber.from(10000);

			const id = await vesting.nextSchedulerIdForHolder(receiver);
			await vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			);

			await network.provider.send("evm_increaseTime", [15000]);
			await network.provider.send("evm_mine");

			await vesting.connect(caller).claimFunds(id);


			const amount = await vesting.balanceOf(caller.address);

			await expect(() => vesting.connect(caller).withdraw(
				id,
				amount
			)).to.changeTokenBalance(vesting, caller, amount.mul(constants.NegativeOne));
		});

		it("Should reverte wiht \"Vesting: only receiver can claim funds\": ", async function () {
			const receiver = caller.address;
			const cliff = 10;
			const totalPeriods = BigNumber.from(1);
			const timePerPeriod = BigNumber.from(10000);

			const id = await vesting.nextSchedulerIdForHolder(receiver);
			await vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			);

			await network.provider.send("evm_increaseTime", [15000]);
			await network.provider.send("evm_mine");

			await vesting.connect(caller).claimFunds(id);

			const amount = await vesting.balanceOf(caller.address);

			await expect(vesting.connect(deployer).withdraw(id, amount))
				.to
				.revertedWith("Vesting: only receiver can claim funds");
		});

		it("Should reverte with \"Vesting: You can't withdraw more than you have\": ", async function () {
			const receiver = caller.address;
			const cliff = 10;
			const totalPeriods = BigNumber.from(1);
			const timePerPeriod = BigNumber.from(10000);

			const id = await vesting.nextSchedulerIdForHolder(receiver);
			await vesting.connect(caller).vest(
				receiver,
				cliff,
				totalPeriods,
				timePerPeriod,
				{
					value: parseEther("1")
				}
			);

			await network.provider.send("evm_increaseTime", [15000]);
			await network.provider.send("evm_mine");

			await vesting.connect(caller).claimFunds(id);

			const amount = await vesting.balanceOf(caller.address);

			await expect(vesting.connect(caller).withdraw(id, amount.mul(BigNumber.from(5))))
				.to
				.revertedWith("Vesting: You can't withdraw more than you have");
		});
	});
});