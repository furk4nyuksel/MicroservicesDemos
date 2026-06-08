import React, { useState, useRef, useCallback, useMemo } from 'react';
import DataGrid, {
  Column,
  Paging,
  Pager,
  FilterRow,
  HeaderFilter,
  SearchPanel,
  Sorting,
  RemoteOperations,
  Summary,
  TotalItem,
  GroupPanel,
  Grouping,
  Lookup,
  Toolbar,
  Item,
} from 'devextreme-react/data-grid';
import CustomStore from 'devextreme/data/custom_store';
import axios from 'axios';
import FilterPanel from './FilterPanel';
import 'devextreme/dist/css/dx.light.css';

const API_URL = 'http://localhost:5050/api/employees/grid';

// ─── Store factory — rebuilds when externalFilter changes ─────────────────────
function createStore(externalFilterRef) {
  return new CustomStore({
    key: 'id',
    load: async (loadOptions) => {
      try {
        let normalizedSort = loadOptions.sort;
        if (normalizedSort) {
          normalizedSort = Array.isArray(normalizedSort) ? normalizedSort : [normalizedSort];
          normalizedSort = normalizedSort.map(s => {
            if (typeof s === 'string') return { selector: s, desc: false };
            return { ...s, desc: s.desc === true || s.desc === 'true' };
          });
        }

        let normalizedGroup = loadOptions.group;
        if (normalizedGroup) {
          normalizedGroup = Array.isArray(normalizedGroup) ? normalizedGroup : [normalizedGroup];
          normalizedGroup = normalizedGroup.map(s => {
            if (typeof s === 'string') return { selector: s, desc: false };
            return { ...s, desc: s.desc === true || s.desc === 'true' };
          });
        }

        // Merge grid's own filter with our custom panel filter
        const gridFilter    = loadOptions.filter;
        const panelFilter   = externalFilterRef.current;
        let mergedFilter    = null;

        if (gridFilter && panelFilter) {
          mergedFilter = [gridFilter, 'and', panelFilter];
        } else {
          mergedFilter = gridFilter || panelFilter || null;
        }

        const response = await axios.post(API_URL, {
          skip:              loadOptions.skip || 0,
          take:              loadOptions.take || 20,
          requireTotalCount: loadOptions.requireTotalCount,
          requireGroupCount: loadOptions.requireGroupCount,
          sort:              normalizedSort,
          group:             normalizedGroup,
          filter:            mergedFilter,
          totalSummary:      loadOptions.totalSummary,
        });

        return {
          data:       response.data.data,
          totalCount: response.data.totalCount,
          groupCount: response.data.groupCount,
          summary:    response.data.summary,
        };
      } catch (error) {
        console.error('Error loading data', error);
        throw new Error('Data loading error');
      }
    },
  });
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const gridInstanceRef     = useRef(null);      // grid component instance
  const externalFilterRef   = useRef(null);      // panel filter (kept in ref, not state)
  const [filterPanelOpen,   setFilterPanelOpen]   = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Stable store — rebuilds only when we explicitly swap storeKey
  const [storeKey, setStoreKey]   = useState(0);
  const store = useMemo(
    () => createStore(externalFilterRef),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeKey],
  );

  // Capture grid instance on mount
  const onInitialized = useCallback((e) => {
    gridInstanceRef.current = e.component;
  }, []);

  // ── Cell renderers ────────────────────────────────────────────────────────
  const typeCellRender = useCallback((cellData) => {
    const isHybrid = cellData.value === 'Hybrid';
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${isHybrid ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
        {isHybrid ? 'Hybrid' : 'Office'}
      </span>
    );
  }, []);

  const statusCellRender = useCallback((cellData) => {
    const isActive = cellData.value;
    return (
      <div className="flex items-center">
        <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm text-slate-600">{isActive ? 'Active' : 'Inactive'}</span>
      </div>
    );
  }, []);

  // ── Filter Panel handlers ─────────────────────────────────────────────────
  const handleApplyFilter = useCallback((devExtremeFilter) => {
    externalFilterRef.current = devExtremeFilter;

    // Count meaningful conditions for badge
    let count = 0;
    if (Array.isArray(devExtremeFilter)) {
      // flat [cond] or [cond, 'and', cond, ...]
      count = devExtremeFilter.filter(item => Array.isArray(item)).length;
      if (count === 0) count = 1; // single condition
    } else if (devExtremeFilter) {
      count = 1;
    }
    setActiveFilterCount(count);

    // Rebuild store so CustomStore picks up the new externalFilterRef value
    setStoreKey(k => k + 1);
    setFilterPanelOpen(false);
  }, []);

  const handleClearFilter = useCallback(() => {
    externalFilterRef.current = null;
    setActiveFilterCount(0);
    setStoreKey(k => k + 1);
  }, []);

  // ── Toolbar button ────────────────────────────────────────────────────────
  const renderFilterButton = useCallback(() => (
    <button
      id="custom-filter-btn"
      className={`filter-toolbar-btn ${activeFilterCount > 0 ? 'filter-toolbar-btn--active' : ''}`}
      onClick={() => setFilterPanelOpen(prev => !prev)}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="filter-btn-icon">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
      <span>Gelişmiş Filtre</span>
      {activeFilterCount > 0 && (
        <span className="filter-badge">{activeFilterCount}</span>
      )}
    </button>
  ), [activeFilterCount]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Employee Directory</h1>
            <p className="text-slate-500 mt-2">Manage and view all employee records using Elasticsearch</p>
          </div>
        </div>

        <div className="grid-filter-layout">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden grid-main">
            <DataGrid
              dataSource={store}
              onInitialized={onInitialized}
              showBorders={false}
              rowAlternationEnabled={true}
              hoverStateEnabled={true}
              columnAutoWidth={true}
              className="premium-grid"
            >
              <RemoteOperations
                paging={true}
                filtering={true}
                sorting={true}
                summary={true}
                grouping={true}
                groupPaging={true}
              />
              <GroupPanel visible={true} />
              <Grouping autoExpandAll={false} />
              <FilterRow visible={true} />
              <HeaderFilter visible={true} />
              <SearchPanel visible={true} width={240} placeholder="Search employees..." />
              <Sorting mode="multiple" />
              <Paging defaultPageSize={15} />
              <Pager
                showPageSizeSelector={true}
                allowedPageSizes={[15, 25, 50, 100]}
                showInfo={true}
              />

              <Toolbar>
                <Item location="before" render={renderFilterButton} />
                <Item name="groupPanel" />
                <Item name="searchPanel" />
              </Toolbar>

              <Summary>
                <TotalItem
                  column="firstName"
                  summaryType="count"
                  displayFormat="Total Employees: {0}"
                />
              </Summary>

              <Column dataField="firstName"  caption="First Name" />
              <Column dataField="lastName"   caption="Last Name" />
              <Column dataField="department" caption="Department" />
              <Column dataField="phone"      caption="Phone" />
              <Column dataField="email"      caption="Email" />
              <Column
                dataField="employeeType"
                caption="Type"
                cellRender={typeCellRender}
                alignment="center"
              >
                <Lookup
                  dataSource={[
                    { value: 'Hybrid', text: 'Hybrid' },
                    { value: 'Office', text: 'Office' },
                  ]}
                  valueExpr="value"
                  displayExpr="text"
                />
              </Column>
              <Column dataField="city" caption="City" />
              <Column
                dataField="workStatus"
                caption="Status"
                dataType="boolean"
                cellRender={statusCellRender}
                alignment="center"
              >
                <Lookup
                  dataSource={[
                    { value: true,  text: 'Active' },
                    { value: false, text: 'Inactive' },
                  ]}
                  valueExpr="value"
                  displayExpr="text"
                />
              </Column>
              <Column
                dataField="hireDate"
                caption="Hire Date"
                dataType="date"
                format="dd MMM yyyy"
              />
            </DataGrid>
          </div>

          <FilterPanel
            isOpen={filterPanelOpen}
            onClose={() => setFilterPanelOpen(false)}
            onApply={handleApplyFilter}
            onClear={handleClearFilter}
            activeCount={activeFilterCount}
          />
        </div>

      </div>
    </div>
  );
}

export default App;
