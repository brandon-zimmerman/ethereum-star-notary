const StarNotary = artifacts.require('StarNotary');

contract('StarNotary', accounts => { 

    let user1 = accounts[1]
    let user2 = accounts[2]
    let user3 = accounts[3]

    let name = 'awesome star!'
    let starStory = "this star was bought for my wife's birthday"
    let ra = "1"
    let dec = "1"
    let mag = "1"
    let starId = 2

    beforeEach(async function() { 
        this.contract = await StarNotary.new({from: accounts[0]});
    });

    describe('can create a star', () => { 
        it('can create a star and get its name', async function () { 
            await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: user1});

            let star = await this.contract.tokenIdToStarInfo(starId);
            assert.equal(star[0], name);
        });       
    });

    describe('star uniqueness', () => {         
        it('check if star with coordinates already exists', async function() {             
            await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: user1});            
            assert.equal(await this.contract.checkIfStarExists(ra, dec, mag, {from: user1}), true);
        });

        it('only stars unique stars can be minted', async function() {            
            await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: user1});
            expectThrow(this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: user1}));
        });        

        it('only stars unique stars can be minted even if their ID is different', async function() {             
            await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: user1});
            let star2Id = 2;        
            expectThrow(this.contract.createStar(name, starStory, ra, dec, mag, star2Id, {from: user1}));            
        });

        it('minting unique stars does not fail', async function() { 
            for(let i = 0; i < 10; i ++) { 
                let id = i;
                let newRa = i.toString();
                let newDec = i.toString();
                let newMag = i.toString();
                await this.contract.createStar(name, starStory, newRa, newDec, newMag, id, {from: user1});
                let starInfo = await this.contract.tokenIdToStarInfo(id);
                assert.equal(starInfo[0], name);
            }
        });
    });

    describe('transferring star ownership', () => { 
        let tx;
        beforeEach(async function () { 
            await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: user1})
        });

        it('user1 can transfer star to user2', async function() { 
            tx = await this.contract.safeTransferFrom(user1, user2, starId, {from: user1});            
            assert.equal(tx.logs[tx.logs.length-1].event, 'Transfer');
        });

        it('user1 can grant user3 the ability to transfer star to user2', async function() { 
            tx = await this.contract.approve(user3, starId, {from: user1});
            assert.equal(tx.logs[tx.logs.length-1].event, 'Approval')

            tx = await this.contract.safeTransferFrom(user1, user2, starId, {from: user3});
            assert.equal(tx.logs[tx.logs.length-1].event, 'Transfer');
        });        

        it('user1 can remove user3s ability to transfer stars', async function() { 
            tx = await this.contract.approve(user3, starId, {from: user1});
            assert.equal(tx.logs[tx.logs.length-1].event, 'Approval')

            tx = await this.contract.approve(0, starId, {from: user1});
            assert.equal(tx.logs[tx.logs.length-1].event, 'Approval');

            expectThrow(this.contract.safeTransferFrom(user1, user2, starId, {from: user3}));   
        });

        it('user1 can grant user3 the ability to transfer all stars', async function() { 
            tx = await this.contract.approve(user3, starId, {from: user1});
            assert.equal(tx.logs[tx.logs.length-1].event, 'Approval')

            tx = await this.contract.safeTransferFrom(user1, user2, starId, {from: user3});
            assert.equal(tx.logs[tx.logs.length-1].event, 'Transfer');
        });

    });

    describe('buying and selling stars', () => { 

        let starPrice = web3.toWei(.01, "ether");

        beforeEach(async function () { 
            await this.contract.createStar(name, starStory, ra, dec, mag, starId, {from: user1})
        });

        describe('user1 can sell a star', () => { 
            it('user1 can put up their star for sale', async function () { 
                let tx = await this.contract.putStarUpForSale(starId, starPrice, {from: user1});
                assert.equal(tx.logs[tx.logs.length-1].event, 'ForSale');
            });

            it('user1 gets the funds after selling a star', async function () { 
                let starPrice = web3.toWei(.05, 'ether')

                await this.contract.putStarUpForSale(starId, starPrice, {from: user1})

                let balanceOfUser1BeforeTransaction = web3.eth.getBalance(user1)
                await this.contract.buyStar(starId, {from: user2, value: starPrice})
                let balanceOfUser1AfterTransaction = web3.eth.getBalance(user1)

                assert.equal(balanceOfUser1BeforeTransaction.add(starPrice).toNumber(), 
                            balanceOfUser1AfterTransaction.toNumber())
            });
        });

        describe('user2 can buy a star that was put up for sale', () => { 
            beforeEach(async function () { 
                await this.contract.putStarUpForSale(starId, starPrice, {from: user1});
            });

            it('user2 is the owner of the star after they buy it', async function() { 
                // Add your logic here
                await this.contract.buyStar(starId, {from: user2, value:starPrice});
                assert.equal(await this.contract.ownerOf(starId), user2);                
            });

            it('user2 ether balance changed correctly', async function () { 
                const balanceOfUser2BeforeTransaction = web3.eth.getBalance(user2);
                await this.contract.buyStar(starId, {from: user2, value: starPrice, gasPrice: 0});
                const balanceOfUser2AfterTransaction = web3.eth.getBalance(user2);
                assert.equal(balanceOfUser2BeforeTransaction.sub(starPrice).toNumber(), balanceOfUser2AfterTransaction.toNumber());
            });
        });

        describe('user3 can put a star up for sale on behalf of user 2', () => {            
            let tx;

            it('user3 cant put star up for sale before delegated permission to sell', async function () {                 
                expectThrow(this.contract.putStarUpForSale(starId, starPrice, {from: user3}));
            });

            it('user1 can approve user3 to put star up for sale', async function () {                                 
                tx = await this.contract.approve(user3, starId, {from: user1});
                assert.equal(tx.logs[tx.logs.length-1].event, 'Approval')
                await this.contract.putStarUpForSale(starId, starPrice, {from: user3});
            });


            it('user3 can be granted approval for all of user1s tokens', async function () { 
                await this.contract.createStar(name, starStory, ra+"1", dec+"1", mag+"1", starId+1, {from: user1});
                tx = await this.contract.setApprovalForAll(user3, true, {from: user1});
                assert.equal(tx.logs[tx.logs.length-1].event, 'ApprovalForAll');
                assert.equal(await this.contract.isApprovedForAll(user1,user3, {from: user2}), true);
                await this.contract.putStarUpForSale(starId, starPrice, {from: user3});
                await this.contract.putStarUpForSale(starId+1, starPrice, {from: user3});

                tx = await this.contract.setApprovalForAll(user3, false, {from: user1});
                assert.equal(tx.logs[tx.logs.length-1].event, 'ApprovalForAll');                
                expectThrow(this.contract.putStarUpForSale(starId, starPrice, {from: user3}));
            });
        });
    });
});

var expectThrow = async function(promise) { 
    try { 
        await promise;
    } catch (error) { 
        assert.exists(error);
        return 
    }

    assert.fail('expected an error, but none was found');
}