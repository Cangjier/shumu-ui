import axios from "axios";
import { IProgress } from "./interfaces";

export const BaseServices = (baseURL: string | undefined) => {
    baseURL = baseURL ?? window.location.href;
    const api = axios.create({
        baseURL: baseURL
    });

    const _runAsync = async (pluginName: string, input: any) => {
        let response = await api.post(`/api/v1/tasks/plugin/runasync`, input, {
            params: {
                pluginName: pluginName
            }
        });
        if (response.status === 200) {
            if (response.data.success) {
                return response.data.data as string;
            } else {
                throw new Error(response.data.message);
            }
        }
        else {
            throw new Error(`${response.status}`);
        }
    }
    const runAsync = async (pluginName: string, input: { [key: string]: any }, onProgress: (progress: IProgress) => void) => {
        let task_id = await _runAsync(pluginName, input);
        let subscribeProgress = new Promise<void>((resolve, reject) => {
            // 建立websocket连接，订阅
            let ws = new WebSocket(`ws://${api.defaults.baseURL?.substring(api.defaults.baseURL?.lastIndexOf("/") + 1)}/`);
            ws.binaryType = 'arraybuffer';
            ws.onopen = () => {
                ws.send(JSON.stringify({
                    task_id: task_id,
                    url: "/api/v1/tasks/subscribeprogress"
                }));
            }
            ws.onmessage = (event) => {
                let data = JSON.parse(event.data);
                if (data.progress) {
                    onProgress(data.progress as IProgress);
                }
            }
            ws.onclose = () => {
                resolve();
            }
        });
        await subscribeProgress;
        let response = await api.get(`/api/v1/tasks/query`, {
            params: {
                id: task_id
            }
        });
        if (response.data.success) {
            return response.data.data.Output;
        }
        else {
            throw new Error(response.data.message)
        }
    }
    const run = async (pluginName: string, input: any) => {
        let response = await api.post(`/api/v1/tasks/run`, {
            Input: input,
            Processor: {
                Type: "Plugin",
                Name: pluginName
            }
        });
        if (response.status === 200) {
            if (response.data.success) {
                return response.data.data.Output;
            } else {
                throw new Error(response.data.message);
            }
        }
        else {
            throw new Error(`${response.status}`);
        }
    }
    return {
        api,
        runAsync,
        run,
        getBaseURL: () => baseURL
    }
}
