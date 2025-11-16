export class Window {
    static InjectUnloaded = false;
    static InjectUnload(closeUrl: string, cancelCloseUrl: string) {
        if (!Window.InjectUnloaded) {
            Window.InjectUnloaded = true;
            fetch(cancelCloseUrl, {
                method: 'POST',
                body: JSON.stringify({}),
                headers: {
                    'Content-Type': 'application/json',
                },
                keepalive: true, // 页面被终止请求也会保持连接
            });
            window.addEventListener('beforeunload', function (event) {
                fetch(closeUrl, {
                    method: 'POST',
                    body: JSON.stringify({}),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    keepalive: true, // 页面被终止请求也会保持连接
                });
            });
        }
    }

    static copyToClipboard = (text: string) => {
        return navigator.clipboard.writeText(text);
    }
}