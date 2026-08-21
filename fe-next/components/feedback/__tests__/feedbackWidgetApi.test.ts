// @vitest-environment happy-dom
/**
 * openFeedbackWidget bridges in-app entry points (header menu "Report a Bug")
 * to the feedback.devtools widget loaded by FeedbackDevtoolsWidget. It must
 * never throw when the async widget script has not finished loading.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { openFeedbackWidget } from '../feedbackWidgetApi';

describe('openFeedbackWidget', () => {
    afterEach(() => {
        delete window.FeedbackDevtools;
    });

    it('returns false and does not throw when the widget script has not loaded', () => {
        expect(openFeedbackWidget()).toBe(false);
    });

    it('returns false when the widget API exists but is not active yet', () => {
        window.FeedbackDevtools = { init: () => true, open: () => {}, destroy: () => {}, active: false };
        expect(openFeedbackWidget()).toBe(false);
    });

    it('opens the modal when the widget is active', () => {
        let opened = 0;
        window.FeedbackDevtools = { init: () => true, open: () => { opened += 1; }, destroy: () => {}, active: true };
        expect(openFeedbackWidget()).toBe(true);
        expect(opened).toBe(1);
    });
});
