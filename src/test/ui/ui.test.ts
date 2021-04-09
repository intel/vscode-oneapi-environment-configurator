import { Workbench, Notification, WebDriver, VSBrowser, NotificationType, ActivityBar, InputBox, ModalDialog } from 'vscode-extension-tester';
import { DialogHandler } from 'vscode-extension-tester-native';
import { expect } from 'chai';
import { join } from 'path';
import { rmdirSync, existsSync } from 'fs';


describe('DevFlow extension UI Tests', function () {
    const workspacePath = join(process.cwd(), 'test-resources', 'samples');
    let driver: WebDriver;
    let activityBar: ActivityBar;
    before(async () => {
        driver = VSBrowser.instance.driver;
        activityBar = new ActivityBar();
        let workbench = new Workbench();
        await workbench.executeCommand('Intel oneAPI: Unset oneAPI environment');
        await driver.sleep(1000);
    });
    describe('Without workspace', function () {

        describe('Intel oneAPI: Set oneAPI environment', function () {

            it('Quick pick contain command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Set oneAPI environment');
                const pick = await input.findQuickPick('Intel oneAPI: Set oneAPI environment');
                expect(pick).not.undefined;
            });

            it('Command shows a notification with the correct text', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Set oneAPI environment');
                await driver.sleep(1000);
                // close the dialog after setting the environment
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');
                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment script'); }, 5000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

        describe('Generation functions show a notification about the absence of a workspace', function () {
            it('Intel oneAPI: Generate tasks', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Generate tasks');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('Please add one or more working directories and try again.'); }, 5000) as Notification;
                // close error msg about workdir
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');
                expect(await notification.getType()).equals(NotificationType.Info);
            });
            it('Intel oneAPI: Generate launch configurations', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Generate launch configurations');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('Please add one or more working directories and try again.'); }, 5000) as Notification;
                // close error msg about workdir
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

        describe('Intel oneAPI: Unset oneAPI environment', function () {
            it('Quick pick contain command', async function () {
                let workbench = new Workbench();
                let input = await workbench.openCommandPrompt() as InputBox;
                await input.setText('>Intel oneAPI: Unset oneAPI environment');
                const pick = await input.findQuickPick('Intel oneAPI: Unset oneAPI environment');
                expect(pick).not.undefined;
            });
            it('Command shows a notification with the correct text', async function () {
                let workbench = new Workbench();
                await workbench.executeCommand('Intel oneAPI: Unset oneAPI environment');
                await driver.sleep(1000);
                const notification = await driver.wait(async () => { return await getNotifications('oneAPI environment removed successfully.'); }, 5000) as Notification;
                expect(await notification.getMessage()).equals('oneAPI environment removed successfully.');
                expect(await notification.getType()).equals(NotificationType.Info);
            });
        });

    });
    describe('With workspace', function () {
        before(async () => {
            let workbench = new Workbench();
            await workbench.executeCommand('File: Open Folder');
            const dialog = await DialogHandler.getOpenDialog();
            await dialog.selectPath(workspacePath);
            await dialog.confirm();
        });
        describe('Intel oneAPI: Generate tasks', function () {
            const vscodeConfigsPath = join(workspacePath, 'matrix-mul', '.vscode');

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

                // close the dialog after setting the environment
                const dialog = new ModalDialog();
                await dialog.pushButton('OK');
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
                const notification = await driver.wait(async () => { return await getNotifications('Task for "build_dpcpp" was added'); }, 5000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });

            it('.vscode folder contains tasks.json file', function () {
                const task = join(vscodeConfigsPath, 'tasks.json');
                expect(existsSync(task)).equals(true);
            });

            after(function () {
                rmdirSync(vscodeConfigsPath, { recursive: true });
            });
        });

        describe('Intel oneAPI: Generate launch configurations', function () {
            const vscodeConfigsPath = join(workspacePath, 'matrix-mul', '.vscode');

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
                const notification = await driver.wait(async () => { return await getNotifications('Launch configuration "Launch_template" for "a.out" was added'); }, 5000) as Notification;
                expect(await notification.getType()).equals(NotificationType.Info);
            });

            it('.vscode folder contains launch.json file', function () {
                const launch = join(vscodeConfigsPath, 'launch.json');
                expect(existsSync(launch)).equals(true);
            });

            after(function () {
                rmdirSync(vscodeConfigsPath, { recursive: true });
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

