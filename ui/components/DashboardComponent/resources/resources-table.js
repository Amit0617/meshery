import React, { useEffect, useMemo, useState } from 'react';
import dataFetch from '../../../lib/data-fetch';
import { useNotification } from '../../../utils/hooks/useNotification';
import { EVENT_TYPES } from '../../../lib/event-types';
import { ResponsiveDataTable } from '@layer5/sistent-components';
import CustomColumnVisibilityControl from '../../../utils/custom-column';
import useStyles from '../../../assets/styles/general/tool.styles';
import SearchBar from '../../../utils/custom-search';
import View from '../view';
import { ALL_VIEW } from './config';
import { getK8sClusterIdsFromCtxId } from '../../../utils/multi-ctx';

const ACTION_TYPES = {
  FETCH_MESHSYNC_RESOURCES: {
    name: 'FETCH_MESHSYNC_RESOURCES',
    error_msg: 'Failed to fetch meshsync resources',
  },
};

const ResourcesTable = (props) => {
  const {
    classes,
    updateProgress,
    k8sConfig,
    resourceConfig,
    submenu,
    workloadType,
    selectedK8sContexts,
  } = props;
  const [meshSyncResources, setMeshSyncResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [pageSize, setPageSize] = useState(0);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [selectedResource, setSelectedResource] = useState({});
  const [view, setView] = useState(ALL_VIEW);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const switchView = (view, resource) => {
    setSelectedResource(resource);
    setView(view);
  };

  const tableConfig = submenu
    ? resourceConfig(switchView, meshSyncResources, k8sConfig)[workloadType]
    : resourceConfig(switchView, meshSyncResources, k8sConfig);

  const clusterIds = encodeURIComponent(
    JSON.stringify(getK8sClusterIdsFromCtxId(selectedK8sContexts, k8sConfig)),
  );

  const StyleClass = useStyles();

  const { notify } = useNotification();

  const getMeshsyncResources = (page, pageSize, search, sortOrder) => {
    setLoading(true);
    if (!search) search = '';
    if (!sortOrder) sortOrder = '';
    dataFetch(
      `/api/system/meshsync/resources?kind=${
        tableConfig.name
      }&status=true&spec=true&annotations=true&labels=true&clusterIds=${clusterIds}&page=${page}&pagesize=${pageSize}&search=${encodeURIComponent(
        search,
      )}&order=${encodeURIComponent(sortOrder)}`,
      {
        credentials: 'include',
        method: 'GET',
      },
      (res) => {
        setMeshSyncResources(res?.resources || []);
        setPage(res?.page || 0);
        setCount(res?.total_count || 0);
        setPageSize(res?.page_size || 0);
        setLoading(false);
      },
      handleError(ACTION_TYPES.FETCH_MESHSYNC_RESOURCES),
    );
  };

  const [tableCols, updateCols] = useState();

  useEffect(() => {
    updateCols(tableConfig.columns);
    if (!loading) {
      getMeshsyncResources(page, pageSize, search, sortOrder);
    }
  }, [page, pageSize, search, sortOrder]);

  const [columnVisibility, setColumnVisibility] = useState(() => {
    // Initialize column visibility based on the original columns' visibility
    const initialVisibility = {};
    tableConfig.columns.forEach((col) => {
      initialVisibility[col.name] = col.options?.display !== false;
    });
    return initialVisibility;
  });

  const options = useMemo(
    () => ({
      filter: false,
      viewColumns: false,
      search: false,
      responsive: 'standard',
      serverSide: true,
      selectableRows: false,
      count,
      rowsPerPage: pageSize,
      rowsPerPageOptions: [10, 25, 30],
      fixedHeader: true,
      page,
      print: false,
      download: false,
      textLabels: {
        selectedRows: {
          text: `${tableConfig.name}(s) selected`,
        },
      },
      enableNestedDataAccess: '.',
      onTableChange: (action, tableState) => {
        const sortInfo = tableState.announceText ? tableState.announceText.split(' : ') : [];
        let order = '';
        if (tableState.activeColumn) {
          order = `${tableConfig.columns[tableState.activeColumn].name} desc`;
        }
        switch (action) {
          case 'changePage':
            setPage(tableState.page.toString());
            break;
          case 'changeRowsPerPage':
            setPageSize(tableState.rowsPerPage.toString());
            break;
          case 'sort':
            if (sortInfo.length == 2) {
              if (sortInfo[1] === 'ascending') {
                order = `${tableConfig.columns[tableState.activeColumn].name} asc`;
              } else {
                order = `${tableConfig.columns[tableState.activeColumn].name} desc`;
              }
            }
            if (order !== sortOrder) {
              setSortOrder(order);
            }
            break;
        }
      },
    }),
    [page, pageSize],
  );

  const handleError = (action) => (error) => {
    updateProgress({ showProgress: false });
    notify({
      message: `${action.error_msg}: ${error}`,
      event_type: EVENT_TYPES.ERROR,
      details: error.toString(),
    });
  };
  return (
    <>
      {view === ALL_VIEW ? (
        <>
          <div
            className={StyleClass.toolWrapper}
            style={{ marginBottom: '5px', marginTop: '1rem' }}
          >
            <div className={classes.createButton}>{/* <MesherySettingsEnvButtons /> */}</div>
            <div
              className={classes.searchAndView}
              style={{
                display: 'flex',
                borderRadius: '0.5rem 0.5rem 0 0',
              }}
            >
              <SearchBar
                onSearch={(value) => {
                  setSearch(value);
                }}
                expanded={isSearchExpanded}
                setExpanded={setIsSearchExpanded}
                placeholder={`Search ${tableConfig.name}...`}
              />

              <CustomColumnVisibilityControl
                columns={tableConfig.columns}
                customToolsProps={{ columnVisibility, setColumnVisibility }}
              />
            </div>
          </div>

          <ResponsiveDataTable
            data={meshSyncResources}
            columns={tableConfig.columns}
            options={options}
            className={classes.muiRow}
            tableCols={tableCols}
            updateCols={updateCols}
            columnVisibility={columnVisibility}
          />
        </>
      ) : (
        <>
          <View
            type={`${tableConfig.name}`}
            setView={setView}
            resource={selectedResource}
            classes={classes}
          />
        </>
      )}
    </>
  );
};

export default ResourcesTable;
