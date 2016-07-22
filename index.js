const debug = require('debug')('electron-vk-oauth2');
const url = require('url');
const qs = require('querystring');
const BrowserWindow = require('electron').BrowserWindow;

const VK_AUTHORIZE_URL = 'https://oauth.vk.com/authorize';
const VK_REDIRECT_URL = 'https://oauth.vk.com/blank.html';

/**
 * Opens a new window to perform VK authentication.
 * @returns {Promise} A promise fillfilled with accessToken, userId and expiresIn values,
 * or rejected promise if login request was cancelled.
 */
function authenticateVK(options, windowOptions) {
    const opts = Object.assign({}, {
        authorizeUrl: VK_AUTHORIZE_URL,
        redirectUri: VK_REDIRECT_URL,
        scope: null,
        display: 'popup',
        revoke: false,
    }, options);

    if (!opts.appId) {
        return Promise.reject(new Error('App id is not specified'));
    }

    const windowOpts = Object.assign({}, {
        height: 430,
        width: 655,
    }, windowOptions);

    const state = Math.floor(Math.random() * 10000);
    const response_type = 'token';

    const query = qs.stringify({
        state,
        response_type,
        client_id: opts.appId,
        scope: opts.scope,
        display: opts.display,
        revoke: opts.revoke ? 1 : 0,
        redirect_uri: opts.redirectUri,
    });

    const vkurl = `${opts.authorizeUrl}?${query}`;

    const win = new BrowserWindow(windowOpts);

    debug('open vk auth window %s', vkurl);
    win.loadURL(vkurl);

    return new Promise((resolve, reject) => {
        win.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl) => {
            debug('Redirect to %s', newUrl);
            const data = url.parse(newUrl);
            // http://stackoverflow.com/questions/16733863/oauth2-0-implicit-grant-flow-why-use-url-hash-fragments
            if (`${data.protocol}//${data.host}${data.pathname}` === opts.redirectUri && data.hash) {
                const query = qs.parse(data.hash.substring(1));
                debug(query);

                if(!('state' in query && query.state === String(state))) {
                    reject(new Error(`Incorrect state: expected ${query.state} to equal ${state}`));
                } else if ('error' in query) {
                    reject(new Error(query.error_description));
                } else if ('access_token' in query && 'user_id' in query && 'expires_in' in query) {
                    resolve({
                        accessToken: query.access_token,
                        userId: query.user_id,
                        expiresIn: query.expires_in,
                    });
                } else {
                    reject(new Error('No access token or error is available'));
                }
                win.destroy();
            }
        });
        win.on('closed', () => {
            reject(new Error('Auth window was closed before completing authentication'));
        });
    });
}

module.exports = authenticateVK;
