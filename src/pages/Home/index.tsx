import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { InjectClass, useUpdate } from "../../natived";
import { Button, Spin, Splitter } from "antd";
import { CloseOutlined, FolderOutlined, MinusOutlined, ProjectOutlined } from "@ant-design/icons";
import { clientServices } from "../../services/clientServices.ts";
import { remoteServices } from "../../services/remoteServices.ts";

export const dragClass = InjectClass(`
-webkit-app-region: drag;
`);

export interface IHomeProps {
    style?: React.CSSProperties;
}

export interface IHomeRef {
    refresh: (showLoading: boolean) => Promise<void>,
    refreshLayoutTabs: () => Promise<void>
}

export interface ILayoutTab {
    key: string,
    icon?: string,
    title: string,
    url: string
}

export const homeAppName = "home-app";
export const homeAppActions = {
    switch: "switch",
}
export const broadcastSwitchToHome = (tab: string, from: string) => {
    clientServices.broadcast({
        is_broadcast_message: true,
        from: from,
        to: homeAppName,
        data: { action: homeAppActions.switch, tab: tab }
    });
};
export const Home = forwardRef<IHomeRef, IHomeProps>((props, ref) => {
    const [loading, updateLoading, loadingRef] = useUpdate<{
        loading: number,
        percent: number | undefined,
        message: string | undefined
    }>({
        loading: 0,
        percent: undefined,
        message: undefined
    });
    const [layoutTabs, updateLayoutTabs] = useUpdate<ILayoutTab[]>([]);
    const [currentTab, updateCurrentTab] = useUpdate<string>("projects");
    const delay = async (time: number) => new Promise(resolve => setTimeout(resolve, time));
    const self = useRef<IHomeRef>({
        refresh: async (showLoading: boolean) => {
            if (showLoading) updateLoading(loading => ({ ...loading, loading: loading.loading + 1 }));
            try {
                while (true) {
                    try {
                        await self.current?.refreshLayoutTabs();
                        break;
                    }
                    catch {
                        delay(1000);
                    }
                }
                clientServices.home();
                updateCurrentTab(localStorage.getItem('currentTab') ?? "documents");
            }
            catch (e) {
                console.log(e);
            }
            if (showLoading) {
                updateLoading(loading => ({ ...loading, loading: loading.loading - 1 }));
            }
        },
        refreshLayoutTabs: async () => {
            let layout = await remoteServices.getLayout();
            updateLayoutTabs(layout.tabs ?? []);
        }
    });
    useImperativeHandle(ref, () => self.current);
    useEffect(() => {
        (window as any).status = 'Shumu AI';
        self.current?.refresh(true);
    }, []);
    useEffect(() => {
        localStorage.setItem('currentTab', currentTab);
    }, [currentTab]);
    useEffect(() => {
        let unregister = clientServices.registerBroadcastEvent((message) => {
            if (message.to == homeAppName && message.data.action == homeAppActions.switch) {
                updateCurrentTab(message.data.tab);
            }
        });
        return () => {
            unregister();
        };
    }, []);
    const renderIcon = (icon?: string) => {
        if (icon == "folder") return <FolderOutlined />;
        else if (icon == "project") return <ProjectOutlined />;
        else return <></>;
    };
    const renderTab = (tab: ILayoutTab) => {
        return <Button style={{
            textAlign: 'left',
            justifyContent: 'start',
            padding: "0px 8px",
            backgroundColor: tab.key == currentTab ? '#e6f7ff' : undefined
        }} type='text' icon={renderIcon(tab.icon)} onClick={() => {
            updateCurrentTab(tab.key);
        }}>{ }</Button>
    };
    const renderContentByUrl = (tab: ILayoutTab) => {
        if (tab.url.startsWith('/')) {
            return <iframe key={tab.url} src={tab.url} style={{
                flex: 1,
                height: 0,
                border: 'none',
                display: currentTab == tab.key ? undefined : 'none'
            }}></iframe>
        }
    };

    return <div style={{
        ...props.style,
        backgroundColor: '#f4f4f4',
        display: 'flex',
        flexDirection: 'column',
    }}>
        <Spin size={'large'} tip={<div style={{
            marginTop: '32px'
        }}>{loading.message}</div>} percent={loading.percent} spinning={loading.loading > 0} fullscreen></Spin>
        {/* 顶部 */}
        <div style={{
            backgroundColor: '#fff',
            margin: '0px 0px 2px 0px',
            padding: '0px 0px 0px 4px',
            display: "flex",
            flexDirection: 'row',
        }}>
            <div style={{
                display: "flex",
                alignItems: 'center',
                padding: '0px 0px 0px 4px',
                fontStyle: 'italic',
                fontWeight: 'bold',
                fontSize: '24px',
                color: '#333',
                letterSpacing: '3px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.2), 0 0 10px rgba(100,100,100,0.1)',
                cursor: 'pointer',
                userSelect: 'none'
            }}>
                {"Shumu AI"}
            </div>

            <div className={dragClass} onMouseDown={e => {
                clientServices.mouseDownDrag();
                e.preventDefault();
                e.stopPropagation();
            }} style={{
                flex: 1,
                userSelect: 'none'
            }}>

            </div>
            <div style={{
                display: "flex",
                alignItems: 'center',
                gap: '4px',
            }}>
                <Button type='text' icon={<MinusOutlined />} onClick={() => {
                    clientServices.minimize();
                }}>{"Minimize"}</Button>
                <Button type='text' icon={<CloseOutlined />} onClick={() => {
                    clientServices.exit();
                }}>{"Close"}</Button>
            </div>

        </div>
        <Splitter style={{
            flex: 1,
            height: 0
        }}>
            <Splitter.Panel defaultSize="240px" min="20px" max="50%">
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: '8px',
                    backgroundColor: '#fff'
                }}>
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        alignItems: 'start',
                    }}>
                        {layoutTabs.map(tab => renderTab(tab))}
                    </div>
                </div>
            </Splitter.Panel>
            <Splitter.Panel>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    backgroundColor: '#fff'
                }}>
                    {layoutTabs.map(item => renderContentByUrl(item))}
                </div>
            </Splitter.Panel>
        </Splitter>
    </div>
});