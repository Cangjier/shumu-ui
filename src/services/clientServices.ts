import axios from "axios";
import { ILocation } from "./interfaces";
import { generateGUID } from "./utils";
import { BaseServices } from "./baseServices";
export interface IBroadcastMessage {
    is_broadcast_message: boolean;
    from: string;
    to: string;
    data: any;
}
export const ClientServices = () => {
    (window as any).app_id = generateGUID();
    const base = BaseServices((window as any).webapplication.baseURL ?? "http://localhost:12332");
    const api = base.api;
    const broadcastWebSocket = new WebSocket(base.getBaseURL() + "/api/v1/app/broadcast");
    const broadcastEvents: ((data: IBroadcastMessage) => void)[] = [];
    broadcastWebSocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.is_broadcast_message) {
            for (const event of broadcastEvents) {
                event(message);
            }
        }
    }
    broadcastWebSocket.onopen = () => {
        broadcastRegister();
    }

    const openUrl = async (url: string, location?: ILocation, resident?: boolean) => {
        ///api/v1/app/open/
        if (location == undefined) {
            location = {
                x: 'center',
                y: 'center',
                width: '60%',
                height: '60%'
            };
        }
        let response = await api.post("/api/v1/app/open", {
            url: window.location.origin + url,
            location,
            resident
        });
        if (response.status === 200) {
            return true;
        } else {
            throw new Error(`${response.status}`);
        }
    }

    const home = async () => {
        console.log("home");
        let response = await api.post("/api/v1/app/home");
        if (response.status === 200) {
            return true;
        } else {
            throw new Error(`${response.status}`);
        }
    }

    const openwithdata = async (url: string, location?: ILocation, data?: any, resident?: boolean) => {
        ///api/v1/app/open/
        if (url.startsWith("/")) {
            url = window.location.origin + url;
        }
        if (location == undefined) {
            location = {
                x: 'center',
                y: 'center',
                width: '60%',
                height: '60%'
            };
        }
        let dataID = generateGUID();
        let response = await api.post("/api/v1/app/openwithdata", {
            url: `${url}?dataID=${dataID}`,
            location,
            dataID,
            data: data ?? {},
            resident
        });
        if (response.status === 200) {
            return true;
        } else {
            throw new Error(`${response.status}`);
        }
    }

    const mouseDownDrag = async () => {
        let webapplication = (window as any).webapplication;
        if (webapplication) {
            await api.post("/api/v1/app/mousedowndrag", {
                id: webapplication.id
            });
        }
    }

    const close = async () => {
        let webapplication = (window as any).webapplication;
        if (webapplication) {
            await api.post("/api/v1/app/close", {
                id: webapplication.id
            });
        }
    }

    const exit = async () => {
        let webapplication = (window as any).webapplication;
        if (webapplication) {
            await api.post("/api/v1/app/exit", {
                id: webapplication.id
            });
        }
    }

    const minimize = async () => {
        let webapplication = (window as any).webapplication;
        if (webapplication) {
            await api.post("/api/v1/app/minimize", {
                id: webapplication.id
            });
        }
    }

    const show = async () => {
        let webapplication = (window as any).webapplication;
        if (webapplication) {
            await api.post("/api/v1/app/show", {
                id: webapplication.id
            });
        }
    }

    const getDataByID = async (id: string) => {
        let webapplication = (window as any).webapplication;
        if (webapplication) {
            let response = await api.post("/api/v1/app/getdatabyid", {
                id
            });
            if (response.status === 200) {
                if (response.data.success) {
                    return response.data.data;
                } else {
                    throw new Error(response.data.message);
                }
            }
        }
        else {
            return undefined;
        }
    }

    const copy = async (text: string) => {
        await api.post("/api/v1/app/copy", {
            text
        });
    }

    const broadcastRegister = async () => {
        broadcastWebSocket.send(JSON.stringify({
            action: "register",
            app_id: (window as any).app_id,
            websocket_session_id: generateGUID(),
            url: "/api/v1/app/broadcast",
            response: "/register-response",
        }));
    };

    const broadcast = async (message: IBroadcastMessage) => {
        broadcastWebSocket.send(JSON.stringify({
            action: "broadcast",
            app_id: (window as any).app_id,
            websocket_session_id: generateGUID(),
            url: "/api/v1/app/broadcast",
            response: "/broadcast-response",
            data: message
        }));
    }

    const registerBroadcastEvent = (event: (data: IBroadcastMessage) => void) => {
        broadcastEvents.push(event);
        return () => {
            let index = broadcastEvents.indexOf(event);
            if (index > -1) {
                broadcastEvents.splice(index, 1);
            }
        }
    }
    return {
        openUrl,
        home,
        openwithdata,
        mouseDownDrag,
        close,
        exit,
        minimize,
        getDataByID,
        show,
        broadcast,
        copy,
        registerBroadcastEvent,
        ...base
    }
}

export const clientServices = ClientServices();