interface LullExtensionState {
    enabled: boolean;
    intensity: 'light' | 'medium' | 'strong';
}

class LullPopupController {
    private enableToggle: HTMLInputElement;
    private intensityButtons: NodeListOf<HTMLButtonElement>;
    private statusText: HTMLElement;
    private state: LullExtensionState = { enabled: true, intensity: 'medium' };

    constructor() {
        this.enableToggle = document.getElementById('enableToggle') as HTMLInputElement;
        this.intensityButtons = document.querySelectorAll('.intensity-btn');
        this.statusText = document.getElementById('statusText')!;

        this.init();
    }

    private async init(): Promise<void> {
        await this.loadState();

        this.enableToggle.addEventListener('change', () => this.handleToggle());

        this.intensityButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const intensity = btn.dataset.intensity as 'light' | 'medium' | 'strong';
                this.handleIntensityChange(intensity);
            });
        });

        this.updateUI();
    }

    private async loadState(): Promise<void> {
        const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
        this.state = response;
    }

    private async saveState(): Promise<void> {
        await chrome.runtime.sendMessage({
            type: 'UPDATE_STATE',
            state: this.state
        });
        this.showStatus('Saved settings', 'success');
    }

    private handleToggle(): void {
        this.state.enabled = this.enableToggle.checked;
        this.saveState();
        this.updateUI();
    }

    private handleIntensityChange(intensity: 'light' | 'medium' | 'strong'): void {
        this.state.intensity = intensity;
        this.saveState();
        this.updateUI();
    }

    private updateUI(): void {
        this.enableToggle.checked = this.state.enabled;

        this.intensityButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.intensity === this.state.intensity);
            btn.disabled = !this.state.enabled;
        });

        const statusTexts = {
            light: 'Light normalization',
            medium: 'Medium normalization',
            strong: 'Strong normalization'
        };

        const statusElement = this.statusText.parentElement!;

        if (this.state.enabled) {
            this.statusText.textContent = statusTexts[this.state.intensity];
            statusElement.classList.add('active');
        } else {
            this.statusText.textContent = 'Normalizer disabled';
            statusElement.classList.remove('active');
        }
    }

    private showStatus(message: string, type: 'success' | 'error'): void {
        const statusElement = this.statusText.parentElement!;
        this.statusText.textContent = message;
        statusElement.classList.add(type);

        setTimeout(() => {
            statusElement.classList.remove(type);
            this.updateUI();
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LullPopupController();
});