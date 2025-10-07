interface LullExtensionState {
    enabled: boolean;
    intensity: 'light' | 'medium' | 'strong';
}

const defaultState: LullExtensionState = {
    enabled: true,
    intensity: 'medium'
};

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set(defaultState);
    console.log('Lull - Audio Normalizer installed successfully');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_STATE') {
        chrome.storage.local.get(defaultState, (state) => {
            sendResponse(state);
        });

        return true;
    }

    if (message.type === 'UPDATE_STATE') {
        chrome.storage.local.set(message.state, () => {
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: 'STATE_CHANGED',
                            state: message.state
                        }).catch(() => {
                            /* Tab might not have the content script loaded */
                        });
                    }
                });
            });

            sendResponse({ success: true });
        });

        return true;
    }
});