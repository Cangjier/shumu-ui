import { Modal } from "antd";
import { Breakpoint } from "antd/es/_util/responsiveObserver";
import { forwardRef, RefObject, useCallback, useEffect, useRef, useState } from "react";
import SparkMD5 from "spark-md5";

export const generateGUID = () => {
    // Helper function to generate a random four-character hexadecimal segment
    function s4(): string {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    // Combine four segments to form a GUID
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

export interface IUseModalSelf {
    setVisible: (visible: boolean) => void;
}

export interface IUseModalOptions {
    footer?: React.ReactNode,
    maskStyles?: React.CSSProperties,
    wrapperStyles?: React.CSSProperties,
    headerStyles?: React.CSSProperties,
    footerStyles?: React.CSSProperties,
    bodyStyles?: React.CSSProperties,
    contentStyles?: React.CSSProperties,
    style?: React.CSSProperties,
    width?: string | number | Partial<Record<Breakpoint, string | number>>,
    height?: string | number,
    onCancelPredicate?: () => boolean,
    onOkPredicate?: () => Promise<boolean>,
}

export function useModal() {
    const [visible, setVisible] = useState(false);
    const resolver = useRef<((value: boolean) => void) | null>(null);
    const [content, setContent] = useState<React.ReactNode | undefined>(undefined);
    const [footer, setFooter] = useState<React.ReactNode | undefined>(undefined);
    const [maskStyles, setMaskStyles] = useState<React.CSSProperties | undefined>(undefined);
    const [wrapperStyles, setWrapperStyles] = useState<React.CSSProperties | undefined>(undefined);
    const [headerStyles, setHeaderStyles] = useState<React.CSSProperties | undefined>(undefined);
    const [footerStyles, setFooterStyles] = useState<React.CSSProperties | undefined>(undefined);
    const [bodyStyles, setBodyStyles] = useState<React.CSSProperties | undefined>(undefined);
    const [contentStyles, setContentStyles] = useState<React.CSSProperties | undefined>(undefined);
    const [style, setStyle] = useState<React.CSSProperties | undefined>(undefined);
    const [width, setWidth] = useState<string | number | Partial<Record<Breakpoint, string | number>> | undefined>(undefined);
    const [height, setHeight] = useState<string | number | undefined>(undefined);
    const onCancelPredicateRef = useRef<() => boolean>(() => true);
    const onOkPredicateRef = useRef<() => Promise<boolean>>(() => Promise.resolve(true));
    const self = useRef<IUseModalSelf>({
        setVisible
    });
    const showModal = useCallback((render: (self: RefObject<IUseModalSelf>) => React.ReactNode, options?: IUseModalOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            resolver.current = resolve;
            const Component = forwardRef(() => render(self));
            setContent(<Component></Component>);
            setFooter(options?.footer);
            setMaskStyles(options?.maskStyles);
            setWrapperStyles(options?.wrapperStyles);
            setHeaderStyles(options?.headerStyles);
            setFooterStyles(options?.footerStyles);
            setBodyStyles(options?.bodyStyles);
            setContentStyles(options?.contentStyles);
            setStyle(options?.style);
            setWidth(options?.width);
            setHeight(options?.height);
            onCancelPredicateRef.current = options?.onCancelPredicate ?? (() => true);
            onOkPredicateRef.current = options?.onOkPredicate ?? (() => Promise.resolve(true));
            setVisible(true);
        });
    }, []);

    const close = (result: boolean) => {
        setVisible(false);
        resolver.current?.(result);
        resolver.current = null;
    };

    const modalContainer = <Modal
        open={visible}
        onCancel={() => {
            if (onCancelPredicateRef.current()) {
                close(false);
            }
        }
        }
        onOk={async () => {
            if (await onOkPredicateRef.current()) {
                close(true);
            }
        }}
        maskClosable={false}
        footer={footer}
        style={style}
        styles={{
            mask: maskStyles,
            wrapper: wrapperStyles,
            header: headerStyles,
            footer: footerStyles,
            body: {
                height: height,
                ...bodyStyles,
            },
            content: contentStyles,
        }}
        width={width}
    >
        {content}
    </Modal>

    return {
        showModal,
        modalContainer,
    };
}


const pathUtilsConstructor = () => {
    // 支持 / 和 \ 混合路径的场景
    const getFileName = (path: string) => {
        const normalizedPath = path.replace(/\\/g, "/");
        return normalizedPath.split("/").pop() ?? "";
    };
    const getDirectoryName = (path: string) => {
        const normalizedPath = path.replace(/\\/g, "/");
        return normalizedPath.substring(0, normalizedPath.lastIndexOf("/"));
    }
    const getFileNameWithoutExtension = (path: string) => {
        const normalizedPath = path.replace(/\\/g, "/");
        const fileName = normalizedPath.split("/").pop() ?? "";
        const lastDotIndex = fileName.lastIndexOf(".");
        if (lastDotIndex === -1) return fileName;
        return fileName.substring(0, lastDotIndex);
    };
    const getFileExtension = (path: string) => {
        const normalizedPath = path.replace(/\\/g, "/");
        const fileName = normalizedPath.split("/").pop() ?? "";
        const lastDotIndex = fileName.lastIndexOf(".");
        if (lastDotIndex === -1) return "";
        return fileName.substring(lastDotIndex + 1);
    };
    return {
        getFileName,
        getFileNameWithoutExtension,
        getFileExtension,
        getDirectoryName,
    };
}

export const pathUtils = pathUtilsConstructor();