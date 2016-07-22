const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const proxyquire = require('proxyquire').noCallThru();

describe('electron-vk-oauth', function () {
    let electronVkOauth;

    beforeEach(function () {
        electronVkOauth = proxyquire('../index', {
            'electron': {
                BrowserWindow: {},
            },
        });
    });

    it('should return rejected promise when appId is not passed in options', function () {
        return expect(electronVkOauth()).to.be.rejectedWith('App id is not specified');
    });
});
