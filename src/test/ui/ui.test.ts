/* eslint-disable no-unused-expressions */
import { Workbench, Notification, WebDriver, VSBrowser, NotificationType, InputBox, ModalDialog } from 'vscode-extension-tester';
// import { DialogHandler } from 'vscode-extension-tester-native';
import { expect } from 'chai';
import { join } from 'path';
import { writeFileSync, mkdirSync, rmdirSync } from 'fs';

describe('DevFlow extension UI Tests', function () {
    const samplesPath = join(process.cwd(), 'test-resources', 'samples');
    let browser: VSBrowser;
    let driver: WebDriver;
    let workbench: Workbench;

    before(async () => {
        browser = VSBrowser.instance;
        driver = browser.driver;
        workbench = new Workbench();
      });

    before(async () => {
        mkdirSync(samplesPath, { recursive: true });
        await workbench.executeCommand('Intel oneAPI: Clear environment variables');
        await driver.sleep(1000);
    });

    describe('Without workspace', function () {
        describe('Default Initialize', function () {
            it('Quick pick contain command', async function () {
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Initialize default environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Initialize default environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                await workbench.executeCommand('Intel oneAPI: Initialize default environment variables');
                await driver.sleep(5000);
                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment script'); }, 70000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

        describe('Intel oneAPI: Clear environment variables', function () {
            it('Quick pick contain command', async function () {
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Clear environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Clear environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                await workbench.executeCommand('Intel oneAPI: Clear environment variables');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment has been successfully removed.'); }, 50000) as Notification;
                expect(await notification.getMessage()).equals('oneAPI environment has been successfully removed.');
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });
    });

    describe('With workspace', function () {
        before(async () => {
            const workbench = new Workbench();
            await workbench.executeCommand('File: Open Folder');
            createSetvarsConfig(samplesPath);
        });

        describe('Default Initialize', function () {
            it('Quick pick contain command', async function () {
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Initialize default environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Initialize default environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                const workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Initialize default environment variables');
                await driver.sleep(5000);

                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment script'); }, 50000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

        describe('Custom Initialize', function () {
            it('Quick pick contain command', async function () {
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Initialize custom environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Initialize custom environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                await workbench.executeCommand('Intel oneAPI: Clear environment variables');
                await workbench.executeCommand('Intel oneAPI: Initialize custom environment variables');
                await driver.sleep(1000);

                const notification = await driver.wait(async () => { return await getNotifications('No setvars_config files are specified'); }, 10000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });
        describe('Intel oneAPI: Switch environment', function () {
            it('Quick pick contain command', async function () {
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Switch environment');
                const pick = await input.findQuickPick('Intel oneAPI: Switch environment');
                expect(pick).not.undefined;
            });

            it('Switching directory shows a notification with the correct text', async function () {
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Switch environment');
                await input.selectQuickPick('Intel oneAPI: Switch environment');
                await driver.sleep(5000);
                const notification = await driver.wait(async () => { return await getNotifications('Alternate environment is not available. Open settings and search for SETVARS_CONFIG to specify the path to your custom configuration file.'); }, 50000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

        describe('Intel oneAPI: Clear environment variables', function () {
            it('Quick pick contain command', async function () {
                const input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Clear environment variables');
                const pick = await input.findQuickPick('Intel oneAPI: Clear environment variables');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                await workbench.executeCommand('Intel oneAPI: Clear environment variables');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('Environment variables were not configured, so environment is not set. No further action needed.'); }, 50000) as Notification;
                expect(await notification.getMessage()).equals('Environment variables were not configured, so environment is not set. No further action needed.');
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