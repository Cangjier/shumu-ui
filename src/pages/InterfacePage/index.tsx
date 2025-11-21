import { forwardRef } from "react";
import { InterfaceApp } from "../../apps/InterfaceApp";

export const InterfacePage = forwardRef<HTMLDivElement, {
    style?: React.CSSProperties;
}>((props, ref) => {
    return <InterfaceApp style={{
        width: "100vw",
        height: "100vh"
    }} />
});