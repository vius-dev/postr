import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { SyncEngine } from './SyncEngine';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';

// Define the task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
        console.log(`[BackgroundTask] Starting background sync: ${new Date().toISOString()}`);
        await SyncEngine.startSync();
        console.log(`[BackgroundTask] Background sync complete`);
    } catch (error) {
        console.error(`[BackgroundTask] Background sync failed:`, error);
        throw error; // Let TaskManager handle the failure
    }
});

export async function registerBackgroundFetchAsync() {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
        if (isRegistered) {
            console.log('[BackgroundTask] Task already registered');
            return;
        }

        await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
            minimumInterval: 15, // expo-background-task uses minutes
        });
        console.log('[BackgroundTask] Task registered');
    } catch (err) {
        console.log('[BackgroundTask] Task Register failed:', err);
    }
}

export async function unregisterBackgroundFetchAsync() {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) return;

    await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
}
