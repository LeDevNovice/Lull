import { LullExtensionState } from "./types/index";
import { presets } from "./utils/constants";

class LullAudioNormalizer {
    private audioContext: AudioContext | null = null;
    private normalizedVideos: WeakMap<HTMLVideoElement, {
        source: MediaElementAudioSourceNode;
        compressor: DynamicsCompressorNode;
        gain: GainNode;
    }> = new WeakMap();
    private settings: LullExtensionState = { enabled: true, intensity: 'medium' };
    private observer: MutationObserver | null = null;

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        const state = await chrome.storage.local.get({ enabled: true, intensity: 'medium' });
        this.settings = state as LullExtensionState;

        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        this.startObserver();

        this.processExistingVideos();

        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'STATE_CHANGED') {
                this.settings = message.state;
                this.updateAllVideos();
            }
        });
    }

    private startObserver(): void {
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        const videos = node.tagName === 'VIDEO'
                            ? [node as HTMLVideoElement]
                            : Array.from(node.querySelectorAll('video'));

                        videos.forEach(video => this.normalizeVideo(video));
                    }
                });
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    private processExistingVideos(): void {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => this.normalizeVideo(video));
    }

    private normalizeVideo(video: HTMLVideoElement): void {
        if (this.normalizedVideos.has(video)) return;
        if (!this.audioContext) return;

        try {
            const source = this.audioContext.createMediaElementSource(video);
            const compressor = this.audioContext.createDynamicsCompressor();
            const gain = this.audioContext.createGain();

            this.applyCompressionSettings(compressor, gain);

            source.connect(compressor);
            compressor.connect(gain);
            gain.connect(this.audioContext.destination);

            this.normalizedVideos.set(video, { source, compressor, gain });

            video.dataset.audioNormalized = 'true';

            console.log('Normalized audio for video :', video.src || video.currentSrc);
        } catch (error) {
            console.warn('Unable to normalize video :', error);
        }
    }

    private applyCompressionSettings(
        compressor: DynamicsCompressorNode,
        gain: GainNode
    ): void {
        if (!this.audioContext) return;

        const time = this.audioContext.currentTime;

        if (!this.settings.enabled) {
            compressor.threshold.setValueAtTime(-50, time);
            compressor.ratio.setValueAtTime(1, time);
            gain.gain.setValueAtTime(1, time);
            return;
        }

        const params = presets[this.settings.intensity];

        compressor.threshold.setValueAtTime(params.threshold, time);
        compressor.ratio.setValueAtTime(params.ratio, time);
        compressor.knee.setValueAtTime(params.knee, time);
        compressor.attack.setValueAtTime(params.attack, time);
        compressor.release.setValueAtTime(params.release, time);
        gain.gain.setValueAtTime(params.gain, time);
    }

    private updateAllVideos(): void {
        document.querySelectorAll('video[data-audio-normalized]').forEach((video) => {
            const nodes = this.normalizedVideos.get(video as HTMLVideoElement);
            if (nodes) {
                this.applyCompressionSettings(nodes.compressor, nodes.gain);
            }
        });
    }
}

const normalizer = new LullAudioNormalizer();