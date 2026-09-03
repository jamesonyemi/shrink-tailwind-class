import * as fs from 'fs';
import * as path from 'path';
import Mocha from 'mocha';

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 10000,
    });

    const testsRoot = path.resolve(__dirname, '..');

    return new Promise((resolve, reject) => {
        const loadTests = (dir: string): void => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    loadTests(fullPath);
                    continue;
                }

                if (entry.isFile() && entry.name.endsWith('.test.js')) {
                    mocha.addFile(fullPath);
                }
            }
        };

        try {
            loadTests(testsRoot);
        } catch (error) {
            reject(error);
            return;
        }

        try {
            mocha.run((failures) => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                    return;
                }

                resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
}
