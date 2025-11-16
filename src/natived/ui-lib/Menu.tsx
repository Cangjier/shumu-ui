import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import React from "react";
import { InjectClass } from "../lib/InjectStyle";
import { useUpdate } from "../lib/Util";

export interface IMenuProps {
    style?: React.CSSProperties,
    title: React.ReactNode,
    menuContentStyle?: React.CSSProperties,
    children: React.ReactNode,
    delay?: number,
    menuPosition?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
    enable?: boolean,
    disableHideWhenClickMenuContent?: boolean,
    getIsClickInside?: (node: Node) => boolean,
}

export interface IMenuRef {
    setMenuOpacity: (opacity: number) => void,
    setMenuVisible: (visible: boolean) => void,
    getMenuVisible: () => boolean
}

const menuClass = InjectClass(`
position: fixed; /* 设置菜单为绝对定位 */
z-index: 99; /* 设置菜单的层叠顺序较高，使其浮在内容之上 */
`);

function containsDescendant(parent: Node, child: Node): boolean {
    let currentNode: Node | null = child;
    let iteration = 0;
    while (currentNode) {
        if (currentNode === parent) {
            return true;
        }
        currentNode = currentNode.parentNode;
        iteration++;
        if (iteration > 1000) {
            return false;
        }
    }
    return false;
}

export const Menu = forwardRef<IMenuRef, IMenuProps>((props, ref) => {
    const [menuVisible, updateMenuVisible, menuVisibleRef] = useUpdate<boolean>(false)
    const [title, setTitle] = useState<React.ReactNode>(props.title)
    const [children, setChildren] = useState<React.ReactNode>(props.children)
    const [style, setStyle] = useState<React.CSSProperties>(props.style ?? {})
    const [menuContentStyle, setMenuContentStyle] = useState<React.CSSProperties>(props.menuContentStyle ?? {})
    const [menuPosition, setMenuPosition] = useState<'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'>(props.menuPosition ?? 'bottomRight')
    const [menuStylePosition, setMenuStylePosition] = useState<React.CSSProperties>({})
    const [menuOpacity, setMenuOpacity] = useState<number>(0)
    const [enable, setEnable] = useState<boolean>(props.enable ?? true)
    const delayRef = useRef<number>(props.delay ?? 300)
    const menuTitleRef = useRef<HTMLDivElement>(null);
    const menuContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTitle(props.title)
    }, [props.title])
    useEffect(() => {
        setChildren(props.children)
    }, [props.children])
    useEffect(() => {
        setStyle(props.style ?? {})
    }, [props.style])
    useEffect(() => {
        setMenuContentStyle(props.menuContentStyle ?? {})
    }, [props.menuContentStyle])
    useEffect(() => {
        delayRef.current = props.delay ?? 300
    }, [props.delay])
    useEffect(() => {
        setMenuPosition(props.menuPosition ?? 'bottomRight')
    }, [props.menuPosition])
    useEffect(() => {
        setEnable(props.enable ?? true)
    }, [props.enable])
    useEffect(() => {
        setMenuStylePosition(getMenuPositionStyle())
    }, [menuPosition])

    const getMenuPositionStyle = () => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const svgRect = menuTitleRef.current?.getBoundingClientRect();
        if (!svgRect) return {};
        let top = 0, left = 0;
        let menuContainerOffsetWidth = menuContentRef.current?.offsetWidth ?? 0;
        let menuContainerOffsetHeight = menuContentRef.current?.offsetHeight ?? 0;
        // 根据菜单位置和 SVG 元素的位置调整 top 和 left 值  
        switch (menuPosition) {
            case 'topLeft':
                top = scrollY + svgRect.top;
                left = scrollX + svgRect.left;
                break;
            case 'topRight':
                top = scrollY + svgRect.top;
                left = scrollX + svgRect.right - menuContainerOffsetWidth;
                break;
            case 'bottomLeft':
                top = scrollY + svgRect.bottom;
                left = scrollX + svgRect.left;
                break;
            case 'bottomRight':
            default:
                top = scrollY + svgRect.bottom;
                left = scrollX + svgRect.left;
                break;
        }
        // 确保菜单在视口内  
        if (left + menuContainerOffsetWidth > viewportWidth + scrollX) {
            left = viewportWidth + scrollX - menuContainerOffsetWidth;
        }
        if (left < scrollX) {
            left = scrollX;
        }
        if (top + menuContainerOffsetHeight > viewportHeight + scrollY) {
            top = viewportHeight + scrollY - menuContainerOffsetHeight;
        }
        if (top < scrollY) {
            top = scrollY;
        }
        return {
            top: `${top}px`,
            left: `${left}px`,
        };
    };
    useEffect(() => {
        if (menuVisible) {
            setMenuStylePosition(getMenuPositionStyle())
            setMenuOpacity(1)
        }
    }, [menuVisible])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuTitleRef.current && !containsDescendant(menuTitleRef.current, event.target as Node)) {
                if (props.disableHideWhenClickMenuContent && menuContentRef.current) {
                    if (containsDescendant(menuContentRef.current, event.target as Node)) {
                        return;
                    }
                }
                if (props.disableHideWhenClickMenuContent && props.getIsClickInside && props.getIsClickInside(event.target as Node)) {
                    return;
                }
                if (delayRef.current === 0) {
                    updateMenuVisible(false)
                }
                else {
                    setTimeout(() => {
                        updateMenuVisible(false)
                    }, delayRef.current)
                }
            }
        };

        document.addEventListener('mouseup', handleClickOutside);

        return () => {
            // 清理事件监听器  
            document.removeEventListener('mouseup', handleClickOutside);
        };
    }, []);

    useImperativeHandle(ref, () => ({
        setMenuOpacity: (opacity: number) => {
            setMenuOpacity(opacity)
        },
        setMenuVisible: (visible: boolean) => {
            updateMenuVisible(visible)
        },
        getMenuVisible: () => {
            return menuVisibleRef.current
        }
    }), []);
    return (
        <div style={{
            ...style
        }}>
            <div ref={menuTitleRef} onClick={
                (e: any) => {
                    if (enable) {
                        setMenuOpacity(0)
                        updateMenuVisible(!menuVisible)
                    }
                }
            }>{title}</div>
            <div ref={menuContentRef} style={{
                backgroundColor: "white",
                boxShadow: "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
                padding: "9px 16px",
                borderRadius: '8px',
                ...menuContentStyle,
                display: menuVisible ? 'flex' : "none",
                flexDirection: 'column',
                ...menuStylePosition,
                opacity: menuOpacity
            }} className={menuClass}>{children}</div>
        </div >
    );
});