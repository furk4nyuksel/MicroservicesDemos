import React from 'react';
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
  Lookup
} from 'devextreme-react/data-grid';
import CustomStore from 'devextreme/data/custom_store';
import axios from 'axios';
import 'devextreme/dist/css/dx.light.css';

const API_URL = 'http://localhost:5050/api/employees/grid';

const employeeStore = new CustomStore({
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

      const response = await axios.post(API_URL, {
        skip: loadOptions.skip || 0,
        take: loadOptions.take || 20,
        requireTotalCount: loadOptions.requireTotalCount,
        requireGroupCount: loadOptions.requireGroupCount,
        sort: normalizedSort,
        group: normalizedGroup,
        filter: loadOptions.filter,
        totalSummary: loadOptions.totalSummary
      });

      return {
        data: response.data.data,
        totalCount: response.data.totalCount,
        groupCount: response.data.groupCount,
        summary: response.data.summary
      };
    } catch (error) {
      console.error('Error loading data', error);
      throw new Error('Data loading error');
    }
  }
});

function App() {
  const typeCellRender = (cellData) => {
    const isHybrid = cellData.value === 0;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${isHybrid ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
        {isHybrid ? 'Hybrid' : 'Office'}
      </span>
    );
  };

  const statusCellRender = (cellData) => {
    const isActive = cellData.value;
    return (
      <div className="flex items-center">
        <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm text-slate-600">{isActive ? 'Active' : 'Inactive'}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Employee Directory</h1>
            <p className="text-slate-500 mt-2">Manage and view all employee records using Elasticsearch</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <DataGrid
            dataSource={employeeStore}
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

            <Summary>
              <TotalItem
                column="firstName"
                summaryType="count"
                displayFormat="Total Employees: {0}"
              />
            </Summary>

            <Column dataField="firstName" caption="First Name" />
            <Column dataField="lastName" caption="Last Name" />
            <Column dataField="department" caption="Department" />
            <Column dataField="phone" caption="Phone" />
            <Column dataField="email" caption="Email" />
            <Column
              dataField="employeeType"
              caption="Type"
              cellRender={typeCellRender}
              alignment="center"
            >
              <Lookup
                dataSource={[
                  { value: 0, text: 'Hybrid' },
                  { value: 1, text: 'Office' }
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
                  { value: true, text: 'Active' },
                  { value: false, text: 'Inactive' }
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

      </div>
    </div>
  );
}

export default App;
