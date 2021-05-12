import { Workbench, Notification, WebDriver, VSBrowser, NotificationType, ActivityBar, InputBox, ModalDialog } from 'vscode-extension-tester';
import { DialogHandler } from 'vscode-extension-tester-native';
import { expect } from 'chai';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';


describe('DevFlow extension UI Tests', function () {
    const samplesPath = join(process.cwd(), 'test-resources', 'samples');
    let driver: WebDriver;
    let activityBar: ActivityBar;
    before(async () => {
        driver = VSBrowser.instance.driver;
        activityBar = new ActivityBar();
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

        describe('Generation functions show a notification about the absence of a workspace', function () {
            it('Intel oneAPI: Generate tasks', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Generate tasks');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('Please add one or more working directories and try again.'); }, 10000) as Notification;
                // close error msg about workdir
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');

                expect(await notification.getType()).equals(NotificationType.Info);
            });
            it('Intel oneAPI: Generate launch configurations', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Generate launch configurations');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('Please add one or more working directories and try again.'); }, 10000) as Notification;
                // close error msg about workdir
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');

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
        describe('Intel oneAPI: Generate tasks', function () {
            const vscodeConfigsPath = join(samplesPath, 'matrix_mul', '.vscode');

            it('Quick pick contain command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Generate tasks');
                const pick = await input.findQuickPick('Intel oneAPI: Generate tasks');
                expect(pick).not.undefined;
            });

            it('Quick pick contain \'build_dpcpp\' task after executing \'Generate tasks\' command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Generate tasks');
                await input.selectQuickPick('Intel oneAPI: Generate tasks');
                await driver.sleep(1000);

                const pick = await input.findQuickPick('build_dpcpp');
                await driver.sleep(1000);
                expect(pick).not.undefined;
            });

            it('Adding the task shows a notification with the correct text', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Generate tasks');
                await input.selectQuickPick('Intel oneAPI: Generate tasks');
                await driver.sleep(1000);
                await input.selectQuickPick('build_dpcpp');
                await driver.sleep(1000);
                const pick = await input.findQuickPick('buid_dpcpp');
                const notification = await driver.wait(async () => { return await getNotifications('Task for "build_dpcpp" was added'); }, 10000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });

            it('.vscode folder contains tasks.json file', function () {
                const task = join(vscodeConfigsPath, 'tasks.json');
                expect(existsSync(task)).equals(true);
            });

            after(function () {
                unlinkSync(join(vscodeConfigsPath, 'tasks.json'));
            });
        });

        describe('Intel oneAPI: Generate launch configurations', function () {
            const vscodeConfigsPath = join(samplesPath, 'matrix_mul', '.vscode');
            before(async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Initialize environment variables');
                await driver.sleep(1000);
                // close the dialog after setting the environment
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');
            });

            it('Quick pick contain command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Generate launch configurations');
                const pick = await input.findQuickPick('Intel oneAPI: Generate launch configurations');
                expect(pick).not.undefined;
            });

            it('Quick pick contain fake executable', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Generate launch configurations');
                await driver.sleep(1000);
                let input = new InputBox();
                let pick = await input.findQuickPick('Put temporal target path "a.out" to replace it later with correct path manually');
                await input.cancel();

                // close warning about debugging
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');

                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                let workbench = new Workbench();
                workbench.executeCommand('Intel oneAPI: Generate launch configurations');
                await driver.sleep(1000);
                let input = new InputBox();
                await input.selectQuickPick('Put temporal target path "a.out" to replace it later with correct path manually');

                // close note about debugging launch template
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');

                await input.cancel();
                await input.cancel();
                await input.cancel();

                // close debug warning on non-CPU devices
                const debugWarning = new ModalDialog();
                await debugWarning.pushButton('OK');

                const notification = await driver.wait(async () => { return await getNotifications('Launch configuration "Launch_template" for "a.out" was added'); }, 10000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });

            it('.vscode folder contains launch.json file', function () {
                const launch = join(vscodeConfigsPath, 'launch.json');
                expect(existsSync(launch)).equals(true);
            });

            after(function () {
                unlinkSync(join(vscodeConfigsPath, 'launch.json'));
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