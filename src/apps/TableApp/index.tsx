import { Table as AntdTable, TablePaginationConfig, TableProps } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { forwardRef } from 'react';
import { useUpdate } from '../../natived';
import { TableRef } from 'antd/es/table';


export interface ITableProps<RecordType = any> extends TableProps<RecordType> {
    tableStyle?: React.CSSProperties,
    disablePagination?: boolean,
    debug?: boolean
}

export const TableApp = forwardRef<TableRef, ITableProps>((props, ref) => {
    const tableContainerRef = useRef<HTMLDivElement | null>(null);
    const [tableBodyHeight, setTableBodyHeight] = useState(100)
    const [disablePagination, updatedisablePagination, disablePaginationRef] = useUpdate<boolean>(props.disablePagination ?? false)
    const hasHeaderListened = useRef(false)
    const debug = props.debug ?? false;

    const getPagination = () => {
        if (disablePagination) {
            return false
        }
        else {
            return {
                defaultPageSize: 50,
                showSizeChanger: false,
                showTotal: (total: any, range: any) => `共 ${total} 个`,
                ...props.pagination,
                position: ['bottomRight'],
                hideOnSinglePage: false
            } as TablePaginationConfig;
        }
    }

    useEffect(() => { //监听tableContainer的变化
        if (tableContainerRef.current) {
            let tableContainer = tableContainerRef.current;
            const resizeObserver = new ResizeObserver(entries => {
                let header = tableContainer.getElementsByClassName("ant-table-header")[0]
                if (hasHeaderListened.current === false && header) {
                    hasHeaderListened.current = true
                    resizeObserver.observe(header);
                }
                if (tableContainer.clientHeight === 0) return;
                let headerHeight = header ? header.clientHeight : 0;
                let paginationHeight = 0;
                if (disablePaginationRef.current === false) {
                    let pagination = tableContainer.getElementsByClassName("ant-table-pagination")[0]
                    if (pagination) {
                        let computedStyle = window.getComputedStyle(pagination);
                        paginationHeight = parseFloat(computedStyle.marginTop) + parseFloat(computedStyle.marginBottom) + pagination.clientHeight;
                    }
                }
                if (debug) {
                    console.log(`ResizeObserver setTableBodyHeight ${tableContainer.clientHeight} - ${headerHeight} - ${paginationHeight} = ${tableContainer.clientHeight - headerHeight - paginationHeight}`)
                }
                setTableBodyHeight(tableContainer.clientHeight - headerHeight - paginationHeight)
            });
            resizeObserver.observe(tableContainer);
            return () => {
                if (resizeObserver) {
                    resizeObserver.unobserve(tableContainer);
                }
            };
        }
    }, []);

    useEffect(() => { //监听分页器容器的变化
        if (tableContainerRef.current) {
            let tableContainer = tableContainerRef.current;
            let spinContainer = tableContainer.getElementsByClassName("ant-spin-container")[0]
            const observer = new MutationObserver(() => {
                if (tableContainer.clientHeight === 0) return;
                let header = tableContainer.getElementsByClassName("ant-table-header")[0]
                let headerHeight = header ? header.clientHeight : 0;
                let paginationHeight = 0;
                if (disablePaginationRef.current === false) {
                    let pagination = tableContainer.getElementsByClassName("ant-table-pagination")[0]
                    if (pagination) {
                        let computedStyle = window.getComputedStyle(pagination);
                        paginationHeight = parseFloat(computedStyle.marginTop) + parseFloat(computedStyle.marginBottom) + pagination.clientHeight;
                    }
                }
                if (debug) {
                    console.log(`MutationObserver setTableBodyHeight ${tableContainer.clientHeight} - ${headerHeight} - ${paginationHeight} = ${tableContainer.clientHeight - headerHeight - paginationHeight}`, tableContainer)
                }
                setTableBodyHeight(tableContainer.clientHeight - headerHeight - paginationHeight)
            });
            const config = { childList: true };
            observer.observe(spinContainer, config);
            return () => {
                if (observer) {
                    observer.disconnect();
                }
            };
        }
    }, []);
    useEffect(() => {
        updatedisablePagination(props.disablePagination ?? false)
    }, [props.disablePagination])

    return <div style={{
        ...props.style,
        position: 'relative',
        overflowY: 'hidden',
    }} ref={tableContainerRef}>
        <AntdTable ref={ref} {...props} scroll={{
            y: tableBodyHeight,
            x: props.scroll?.x ?? 'max-content'
        }} style={{
            ...props.style
        }} pagination={getPagination()}>
        </AntdTable>
    </div>
})

