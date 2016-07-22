const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const url = require('url');

describe('electron-vk-oauth', function () {
    let sandbox;
    let electronVkOauth;
    let browserWindowSpy;

    let webContentsOnStub;
    let onStub;
    let loadURLStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });
    beforeEach(function () {
        webContentsOnStub = sandbox.stub();
        loadURLStub = sandbox.stub();
        onStub = sandbox.stub();

        // cannot use arrow function otherwise sinon's calledWithNew won't work
        browserWindowSpy = sandbox.spy(function BrowserWindow() {
            return {
                webContents: {
                    on: webContentsOnStub,
                },
                loadURL: loadURLStub,
                on: onStub,
            }
        });
        electronVkOauth = proxyquire('../index', {
            'electron': {
                BrowserWindow: browserWindowSpy,
            },
        });
    });
    afterEach(function () {
        sandbox.restore();
    });

    it('should return rejected promise when appId is not passed in options', function () {
        return expect(electronVkOauth()).to.be.rejectedWith('App id is not specified');
    });

    describe('options', function () {
        let evo;
        const appId = '1234567';

        describe('main', function () {
            let res;
            describe('defaults', function () {
                beforeEach(function () {
                    electronVkOauth({
                        appId,
                    });
                    expect(loadURLStub).calledOnce;
                    res = url.parse(loadURLStub.firstCall.args[0], true);
                });
                it('has client_id set to appId', function () {
                    expect(res.query.client_id).to.equal(appId);
                });
                it('has state', function () {
                    expect(res.query.state).not.to.be.undefined;
                });
                it('has response_type set to token', function () {
                    expect(res.query.response_type).to.equal('token');
                })
                it('uses default authorizeUrl - https://oauth.vk.com/authorize', function () {
                    expect(`${res.protocol}//${res.host}${res.pathname}`).to.equal('https://oauth.vk.com/authorize');
                });
                it('uses default redirect_uri - https://oauth.vk.com/blank.html', function () {
                    expect(res.query.redirect_uri).to.equal('https://oauth.vk.com/blank.html');
                });
                it('uses default display - popup', function () {
                    expect(res.query.display).to.equal('popup');
                });
                it('uses default revoke - 0', function () {
                    expect(res.query.revoke).to.equal('0');
                });
            });
            it('uses specified parameters', function () {
                const options = {
                    appId,
                    authorizeUrl: 'https://test-authorize-url.com/oauth',
                    redirectUri: 'https://test-redirect-url.com/redirect',
                    scope: 'photos',
                    display: 'mobile',
                    revoke: true,
                }
                electronVkOauth(options);
                expect(loadURLStub).calledOnce;
                res = url.parse(loadURLStub.firstCall.args[0], true);

                expect(res.query.client_id).to.equal(options.appId);
                expect(res.query.state).not.to.be.undefined;
                expect(res.query.response_type).to.equal('token');

                expect(`${res.protocol}//${res.host}${res.pathname}`).to.equal(options.authorizeUrl);
                expect(res.query.redirect_uri).to.equal(options.redirectUri);
                expect(res.query.scope).to.equal('photos');
                expect(res.query.display).to.equal(options.display);
                expect(res.query.revoke).to.equal('1');
            });
        });

        describe('browser window', function () {
            describe('defaults', function () {
                let res;
                beforeEach(function () {
                    electronVkOauth({
                        appId,
                    });
                    expect(browserWindowSpy).calledWithNew;
                    res = browserWindowSpy.firstCall.args[0];
                })
                it('uses default height of 430', function () {
                    expect(res.height).to.equal(430);
                });
                it('uses default width of 655', function () {
                    expect(res.width).to.equal(655);
                });
            });
            it('uses specified options', function () {
                const height = 1000;
                const width = 500;
                const parent = { mainWin: true }; // mock main Browser Window

                const windowOptions = {
                    width,
                    height,
                    parent,
                    minimizable: false,
                    maximizable: false,
                    resizable: false,
                };

                electronVkOauth({
                    appId,
                }, windowOptions);
                expect(browserWindowSpy).calledWithNew;

                expect(browserWindowSpy.firstCall.args[0].width).to.equal(width);
                expect(browserWindowSpy.firstCall.args[0].height).to.equal(height);
                expect(browserWindowSpy.firstCall.args[0].parent).to.equal(parent);
                expect(browserWindowSpy.firstCall.args[0].minimizable).to.equal(windowOptions.minimizable);
                expect(browserWindowSpy.firstCall.args[0].maximizable).to.equal(windowOptions.maximizable);
                expect(browserWindowSpy.firstCall.args[0].resizable).to.equal(windowOptions.resizable);
            });
        });
    });
});
