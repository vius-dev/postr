import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { SyncEngine } from './SyncEngine';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';

// Define the task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
        console.log(`[BackgroundFetch] Starting background sync: ${new Date().toISOString()}`);
        await SyncEngine.startSync();
        console.log(`[BackgroundFetch] Background sync complete`);
        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
        console.error(`[BackgroundFetch] Background sync failed:`, error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

export async function registerBackgroundFetchAsync() {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
        if (isRegistered) {
            console.log('[BackgroundFetch] Task already registered');
            return;
        }

        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
            minimumInterval: 60 * 15, // 15 minutes
            stopOnTerminate: false, // Continue even if app is closed (OS permitting)
            startOnBoot: true, // Android only
        });
        console.log('[BackgroundFetch] Task registered');
    } catch (err) {
        console.log('[BackgroundFetch] Task Register failed:', err);
    }
}

export async function unregisterBackgroundFetchAsync() {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) return;

    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
}
