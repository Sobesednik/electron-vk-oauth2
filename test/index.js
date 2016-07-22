const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');
const url = require('url');

// http://stackoverflow.com/a/35820220
function promiseState(p) {
    return Promise.race([
        Promise.all([p, Promise.resolve()]).then(() => 'fulfilled', () => 'rejected'),
        Promise.resolve().then(0).then(() => 'pending')
    ]);
}

describe('electron-vk-oauth', function () {
    const appId = '1234567';

    let sandbox;
    let electronVkOauth;
    let browserWindowSpy;

    let webContentsOnStub;
    let onStub;
    let loadURLStub;
    let destroyStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });
    beforeEach(function () {
        webContentsOnStub = sandbox.stub();
        loadURLStub = sandbox.stub();
        onStub = sandbox.stub();
        destroyStub = sandbox.stub();

        // cannot use arrow function otherwise sinon's calledWithNew won't work
        browserWindowSpy = sandbox.spy(function BrowserWindow() {
            return {
                webContents: {
                    on: webContentsOnStub,
                },
                loadURL: loadURLStub,
                on: onStub,
                destroy: destroyStub,
            };
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
        describe('main', function () {
            let res;
            describe('defaults', function () {
                beforeEach(function () {
                    electronVkOauth({ appId });
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
                });
                it('uses default authorizeUrl - https://oauth.vk.com/authorize', function () {
                    expect(`${res.protocol}//${res.host}${res.pathname}`)
                        .to.equal('https://oauth.vk.com/authorize');
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
                };
                electronVkOauth(options);
                expect(loadURLStub).calledOnce;
                res = url.parse(loadURLStub.firstCall.args[0], true);

                expect(res.query.client_id).to.equal(options.appId);
                expect(res.query.state).not.to.be.undefined;
                expect(res.query.response_type).to.equal('token');

                expect(`${res.protocol}//${res.host}${res.pathname}`)
                    .to.equal(options.authorizeUrl);
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
                    electronVkOauth({ appId });
                    expect(browserWindowSpy).calledWithNew;
                    res = browserWindowSpy.firstCall.args[0];
                });
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

                expect(browserWindowSpy.firstCall.args[0]).to.eql(windowOptions);
            });
        });
    });
    describe('logic', function () {
        let evo;

        const accessToken = 'test_access_token';
        const userId = 'test_user_id';
        const expiresIn = '86400';

        beforeEach(function () {
            evo = electronVkOauth({ appId });
        });
        it('rejects promise on window close', function () {
            expect(onStub).calledOnce;
            expect(onStub.firstCall.args[0]).to.equal('closed');
            const fn = onStub.firstCall.args[1];
            fn.call();
            return expect(evo)
                .to.be.rejectedWith('Auth window was closed before completing authentication');
        });
        describe('did-receive-redirect', function () {
            let fn;
            let state;
            const event = { event: true }; // mock event
            const oldUrl = '';

            beforeEach(function () {
                expect(webContentsOnStub).calledOnce;
                expect(webContentsOnStub.firstCall.args[0]).to.equal('did-get-redirect-request');
                fn = webContentsOnStub.firstCall.args[1];

                state = url.parse(loadURLStub.firstCall.args[0], true).query.state;
            });
            it('does not fulfill or reject promise if redirect uri does not match', function () {
                const url = 'https://login.vk.com';
                fn.call(null, event, oldUrl, url);
                return promiseState(evo).then((res) => {
                    expect(res).to.equal('pending');
                });
            });
            it('rejects promise if state is missing', function () {
                const url = 'https://oauth.vk.com/blank.html#somedata';
                evo.catch().then(() => {
                    evo.isRunning = false;
                });
                fn.call(null, event, oldUrl, url);
                return expect(evo)
                    .to.be.rejectedWith(`Incorrect state: expected undefined to equal ${state}`);
            });
            it('rejects promise if error is url', function () {
                const url = `https://oauth.vk.com/blank.html#state=${state}&error`;
                fn.call(null, event, oldUrl, url);
                return expect(evo).to.be.rejected;
            });
            it('rejects promise if error is url and error_description is available', function () {
                const url = `https://oauth.vk.com/blank.html#state=${state}&error=access_denied&` +
                      'error_description=User%20denied%20your%20request';
                fn.call(null, event, oldUrl, url);
                return expect(evo).to.be.rejectedWith('User denied your request');
            });
            it('rejects promise no error or access token are available', function () {
                const url = `https://oauth.vk.com/blank.html#state=${state}`;
                fn.call(null, event, oldUrl, url);
                return expect(evo).to.be.rejectedWith('No access token or error is available');
            });
            it('fulfills the promise when access_token is present', function () {
                const url = `https://oauth.vk.com/blank.html#state=${state}&` +
                      `access_token=${accessToken}&user_id=${userId}&expires_in=${expiresIn}`;
                fn.call(null, event, oldUrl, url);
                return evo.then((res) => {
                    expect(res).to.contain.keys(['accessToken', 'userId', 'expiresIn']);
                    expect(res.accessToken).to.equal(accessToken);
                    expect(res.userId).to.equal(userId);
                    expect(res.expiresIn).to.equal(expiresIn);
                });
            });
            it('destroys window on error', function () {
                const url = `https://oauth.vk.com/blank.html#state=${state}`;
                fn.call(null, event, oldUrl, url);
                expect(destroyStub).calledOnce;
            });
            it('destroys window on success', function () {
                const url = `https://oauth.vk.com/blank.html#state=${state}&` +
                      `access_token=${accessToken}&user_id=${userId}&expires_in=${expiresIn}`;
                fn.call(null, event, oldUrl, url);
                expect(destroyStub).calledOnce;
            });
        });
    });
});
