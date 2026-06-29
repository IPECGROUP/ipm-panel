// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/layout/Shell.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PaymentRequestPage from "./pages/PaymentRequestPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { useAuth } from "./components/AuthProvider.jsx";
import ContractInformation from "./pages/ContractInformation.jsx";
import RequestDetailPage from "./pages/RequestDetailPage.jsx";
import Projects2Page from "./pages/Projects2Page.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import TagsPage from "./pages/TagsPage.jsx";
import DefineBudgetCentersPage from "./pages/DefineBudgetCentersPage.jsx";
import UnitsPage from "./pages/UnitsPage.jsx";
import BaseCurrenciesPage from "./pages/BaseCurrenciesPage.jsx";
import EstimatesPage from "./pages/EstimatesPage.jsx";
import RevenueEstimatesPage from "./pages/RevenueEstimatesPage.jsx";
import DailyReportPage from "./pages/DailyReportPage.jsx";
import FinancialWorksheetPage from "./pages/FinancialWorksheetPage.jsx";
import CostBreakdownPage from "./pages/CostBreakdownPage.jsx";
import CashFlowForecastPage from "./pages/CashFlowForecastPage.jsx";
import BudgetAllocationPage from "./pages/BudgetAllocationPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import LettersPage from "./pages/LettersPage.jsx";
import TestEditorPage from "./pages/TestEditorPage.jsx";
import RoznegarPgae from "./pages/RoznegarPgae.jsx";
import QualityManagementPage from "./pages/QualityManagementPage.jsx";
import NavPlaceholderPage from "./pages/NavPlaceholderPage.jsx";

import BudgetCodesPage, {
  OfficePage,
  SitePage,
  FinancePage,
  CashPage,
  CapexPage,
} from "./pages/BudgetCodesPage.jsx";

const api = async (path, opt = {}) => {
  console.log("mock api called:", path, opt);

  await new Promise((r) => setTimeout(r, 200));

  if (path.startsWith("/centers/")) {
    return {
      items: [],
    };
  }

  return {};
};

function PrivateRoute({ children }) {
  const auth = useAuth();
  const user = auth?.user;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* صفحه لاگین خارج از شِل */}
      <Route path="/login" element={<LoginPage />} />

      {/* بقیهٔ اپ داخل شِل + محافظ لاگین */}
      <Route
        element={
          <PrivateRoute>
            <Shell />
          </PrivateRoute>
        }
      >
        {/* داشبورد و درخواست پرداخت و ... */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/requests" element={<PaymentRequestPage />} />
        <Route path="/payment" element={<PaymentRequestPage />} />
        <Route path="/requests/:id" element={<RequestDetailPage />} />
        <Route path="/contracts/info" element={<ContractInformation />} />
        <Route path="/centers/contract-info" element={<ContractInformation />} />

        {/* پروژه‌ها */}
        <Route path="/projects/simple" element={<Projects2Page />} />
        <Route path="/centers/projects" element={<ProjectsPage />} />
        <Route path="/projects/cost-breakdown" element={<CostBreakdownPage />} />
        <Route path="/projects/financial-commitments" element={<NavPlaceholderPage title="تعهدات و مصارف مالی" />} />
        <Route path="/projects/daily-report" element={<DailyReportPage />} />
        <Route
          path="/projects/financial-worksheet"
          element={<FinancialWorksheetPage />}
        />
        <Route path="/projects/project-management-dashboard" element={<NavPlaceholderPage title="داشبورد مدیریت پروژه" />} />
        <Route path="/projects/daily-log" element={<RoznegarPgae />} />
        <Route path="/letters" element={<LettersPage />} />
        <Route path="/quality-management" element={<QualityManagementPage />} />

        <Route path="/test/editor" element={<TestEditorPage />} />

        {/* بودجه‌بندی */}
        <Route path="/budget/centers" element={<DefineBudgetCentersPage />} />
        <Route path="/estimates" element={<EstimatesPage api={api} />} />
        <Route path="/revenue-estimates" element={<RevenueEstimatesPage />} />
        <Route path="/budget-allocation" element={<BudgetAllocationPage />} />
        <Route path="/budget/reports" element={<ReportsPage />} />
        <Route path="/finance/payment-request" element={<PaymentRequestPage />} />
        <Route path="/finance/liquidity-allocation" element={<NavPlaceholderPage title="تخصیص نقدینگی" />} />
        <Route path="/finance/cash-flow-forecast" element={<CashFlowForecastPage />} />
        <Route path="/finance/financial-management-dashboard" element={<NavPlaceholderPage title="داشبورد مدیریت مالی" />} />

        <Route path="/supply/request" element={<NavPlaceholderPage title="درخواست تامین" />} />
        <Route path="/supply/actions" element={<NavPlaceholderPage title="اقدامات تامین" />} />
        <Route path="/supply/dashboard" element={<NavPlaceholderPage title="داشبورد مدیریت تامین و پشتیبانی" />} />

        <Route path="/operations/equipment" element={<NavPlaceholderPage title="ماشین آلات و تجهیزات" />} />
        <Route path="/operations/history" element={<NavPlaceholderPage title="سوابق عملیات" />} />

        {/* اطلاعات پایه */}
        <Route path="/base/units" element={<UnitsPage />} />
        <Route path="/base/currencies" element={<BaseCurrenciesPage />} />
        <Route path="/base/tags" element={<TagsPage />} />
        <Route
          path="/base/budget-codes"
          element={
            <BudgetCodesPage
              api={api}
              title="کدهای بودجه دفتر"
              apiKey="office"
              prefix="OB-"
            />
          }
        />

        {/* مدیریت کاربران به تب کاربران در ساختار سازمانی منتقل شده است */}
        <Route path="/admin/users" element={<Navigate to="/base/units?tab=users" replace />} />

        {/* ریدایرکت ریشه به داشبورد */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* هر آدرسِ ناشناخته → داشبورد */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
