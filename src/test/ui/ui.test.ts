import { Workbench, Notification, WebDriver, VSBrowser, NotificationType, InputBox, ModalDialog } from 'vscode-extension-tester';
import { DialogHandler } from 'vscode-extension-tester-native';
import { expect } from 'chai';
import { join } from 'path';
import { writeFileSync, mkdirSync, rmdirSync } from 'fs';

describe('DevFlow extension UI Tests', function () {
    const samplesPath = join(process.cwd(), 'test-resources', 'samples');
    let driver: WebDriver;
    before(async () => {
        mkdirSync(samplesPath, { recursive: true });
        driver = VSBrowser.instance.driver;
        const workbench = new Workbench();
        await workbench.executeCommand('Intel oneAPI: Clear environment variables');
        await driver.sleep(1000);
    });

    describe('Without workspace', function () {
        describe('Default Initialize', function () {
            it('Quick pick contain command', async function () {
                const workbench = new Workbench();
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Initialize default environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Initialize default environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                const workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Initialize default environment variables');
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
                const workbench = new Workbench();
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Clear environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Clear environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                const workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Clear environment variables');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment removed successfully.'); }, 10000) as Notification;
                expect(await notification.getMessage()).equals('oneAPI environment removed successfully.');
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });
    });

    describe('With workspace', function () {
        before(async () => {
            const workbench = new Workbench();
            await workbench.executeCommand('File: Open Folder');
            const dialog = await DialogHandler.getOpenDialog();
            await dialog.selectPath(samplesPath);
            await dialog.confirm();
            createSetvarsConfig(samplesPath);
        });

        describe('Default Initialize', function () {
            it('Quick pick contain command', async function () {
                const workbench = new Workbench();
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Initialize default environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Initialize default environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                const workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Initialize default environment variables');
                await driver.sleep(1000);
                // close the dialog after setting the environment
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');

                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment script'); }, 10000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

        describe('Custom Initialize', function () {
            it('Quick pick contain command', async function () {
                const workbench = new Workbench();
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Initialize custom environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Initialize custom environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                const workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Clear environment variables');
                await workbench.executeCommand('Intel oneAPI: Initialize custom environment variables');
                await driver.sleep(1000);

                const notification = await driver.wait(async () => { return await getNotifications('No setvars_config files are specified'); }, 10000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });
        describe('Intel oneAPI: Switch environment', function () {
            it('Quick pick contain command', async function () {
                const workbench = new Workbench();
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Switch environment');
                const pick = await input.findQuickPick('Intel oneAPI: Switch environment');
                expect(pick).not.undefined;
            });

            it('Switching directory shows a notification with the correct text', async function () {
                const workbench = new Workbench();
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Switch environment');
                await input.selectQuickPick('Intel oneAPI: Switch environment');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('Nothing to switch!'); }, 10000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

        describe('Intel oneAPI: Clear environment variables', function () {
            it('Quick pick contain command', async function () {
                const workbench = new Workbench();
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Clear environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Clear environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                const workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Clear environment variables');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('Undefined environment'); }, 10000) as Notification;
                expect(await notification.getMessage()).equals('Environment variables have not been configured previously and cannot be cleared.');
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });
    });

    after(async () => {
        rmdirSync(samplesPath, { recursive: true });
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

function createSetvarsConfig(path: string): void {
    const configContent = 'default=exclude\nmkl=latest\nipp=latest';
    const configPath = join(path, 'oneAPIconfig.txt');
    writeFileSync(configPath, configContent);

    const vscodeFolderPath = join(path, '.vscode');
    mkdirSync(vscodeFolderPath, { recursive: true });
    const settingsJsonContent = `{\n"SETVARS_CONFIG":"${configPath}"\n}`;
    const settingsJsonPath = join(vscodeFolderPath, 'settings.json');
    writeFileSync(settingsJsonPath, settingsJsonContent);

}