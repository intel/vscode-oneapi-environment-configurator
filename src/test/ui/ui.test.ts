import { Workbench, Notification, WebDriver, VSBrowser, NotificationType, ActivityBar, InputBox, ModalDialog } from 'vscode-extension-tester';
import { DialogHandler } from 'vscode-extension-tester-native';
import { expect } from 'chai';
import { join } from 'path';

describe('DevFlow extension UI Tests', function () {
    const samplesPath = join(process.cwd(), 'test-resources', 'samples');
    let driver: WebDriver;
    before(async () => {
        driver = VSBrowser.instance.driver;
        let workbench = new Workbench();
        await workbench.executeCommand('Intel oneAPI: Clear environment variables');
        await driver.sleep(1000);
    });
    describe('Without workspace', function () {
        describe('Intel oneAPI: Initialize environment variables', function () {
            it('Quick pick contain command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Initialize environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Initialize environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Initialize environment variables');
                await driver.sleep(1000);
                // close the dialog after setting the environment
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');

                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment script'); }, 10000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

        describe('Intel oneAPI: Clear environment variables', function () {
            it('Quick pick contain command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Clear environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Clear environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Clear environment variables');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment removed successfully.'); }, 10000) as Notification;
                expect(await notification.getMessage()).equals('oneAPI environment removed successfully.');
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });
    });

    describe('With single-root workspace', function () {
        before(async () => {
            let workbench = new Workbench();
            await workbench.executeCommand('File: Open Folder');
            const dialog = await DialogHandler.getOpenDialog();
            await dialog.selectPath(samplesPath);
            await dialog.confirm();
        });

        describe('Intel oneAPI: Initialize environment variables', function () {
            it('Quick pick contain command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Initialize environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Initialize environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Initialize environment variables');
                await driver.sleep(1000);
                // close the dialog after setting the environment
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');

                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment script'); }, 10000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

        describe('Intel oneAPI: Clear environment variables', function () {
            it('Quick pick contain command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Clear environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Clear environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Clear environment variables');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment removed successfully.'); }, 10000) as Notification;
                expect(await notification.getMessage()).equals('oneAPI environment removed successfully.');
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });
    });

    describe('With multi-root workspace', function () {
        before(async () => {
            let workbench = new Workbench();
            let emptyFolderPath = join(process.cwd(), 'test-resources', 'tmp');
            await workbench.executeCommand('Workspaces: Add Folder to Workspace');
            const dialog = await DialogHandler.getOpenDialog();
            await dialog.selectPath(emptyFolderPath);
            await dialog.confirm();
        });
        
        describe('Intel oneAPI: Switch environment', function () {
            it('Quick pick contain command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Switch environment');
                const pick = await input.findQuickPick('Intel oneAPI: Switch environment');
                expect(pick).not.undefined;
            });

            it('Switching directory shows a notification with the correct text', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Switch environment');
                await input.selectQuickPick('Intel oneAPI: Switch environment');
                await driver.sleep(1000);
                await input.selectQuickPick('tmp');
                const notification = await driver.wait(async () => { return await getNotifications('Working directory selected: tmp'); }, 10000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

        describe('Intel oneAPI: Initialize environment variables', function () {
            it('Quick pick contain command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Initialize environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Initialize environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Initialize environment variables');
                await driver.sleep(1000);
                // close the dialog after setting the environment
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');

                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment script'); }, 10000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

        describe('Intel oneAPI: Clear environment variables', function () {
            it('Quick pick contain command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Clear environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Clear environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Clear environment variables');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment removed successfully.'); }, 10000) as Notification;
                expect(await notification.getMessage()).equals('oneAPI environment removed successfully.');
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });
    });
});


async function getNotifications(text: string): Promise<Notification | undefined> {
    const notifications = await new Workbench().getNotifications();
    for (const notification of notifications) {
        const message = await notification.getMessage();
        if (message.indexOf(text) >= 0) {
            return notification;
        }
    }
}