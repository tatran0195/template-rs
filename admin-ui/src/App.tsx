import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { PageLoading } from "@/components/ui/misc";
import { Login, Register } from "@/pages/auth/Login";
import { Setup } from "@/pages/Setup";
import { Categories, Tags } from "@/pages/Categories";
import { Comments } from "@/pages/Comments";
import { ReusableBlocks } from "@/pages/ReusableBlocks";
import { PostList } from "@/pages/posts/PostList";
import { PageList } from "@/pages/pages/PageList";
import { Media } from "@/pages/Media";
import { ContentTypeList } from "@/pages/content-types/ContentTypeList";
import { ContentTypeBuilder } from "@/pages/content-types/ContentTypeBuilder";
import { CollectionList } from "@/pages/content-types/Collection";
import { CollectionEdit } from "@/pages/content-types/CollectionEdit";
import { Users } from "@/pages/Users";
import { Rbac } from "@/pages/Rbac";
import { Crons, CronDetail } from "@/pages/Crons";
import { Webhooks } from "@/pages/Webhooks";
import { Tokens } from "@/pages/Tokens";
import { WorkflowList } from "@/pages/workflows/WorkflowList";
import { WorkflowInstances } from "@/pages/workflows/WorkflowInstances";
import { Audit } from "@/pages/Audit";
import { Options } from "@/pages/Options";
import { Profile } from "@/pages/Profile";
import { NotFound } from "@/pages/NotFound";

/* Heavy pages are lazy-loaded — mirroring the recovered bundle's chunk strategy
   (vendor-md-editor, vendor-xyflow, vendor-chart split out of the main bundle). */
const Dashboard = lazy(() =>
  import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const PostEdit = lazy(() =>
  import("@/pages/posts/PostEdit").then((m) => ({ default: m.PostEdit })),
);
const PageEdit = lazy(() =>
  import("@/pages/pages/PageEdit").then((m) => ({ default: m.PageEdit })),
);
const WorkflowEditor = lazy(() =>
  import("@/pages/workflows/WorkflowEditor").then((m) => ({
    default: m.WorkflowEditor,
  })),
);

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/user-login" element={<Login user />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/setup" element={<Setup />} />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <Lazy>
                <Dashboard />
              </Lazy>
            }
          />

          <Route path="posts" element={<PostList />} />
          <Route
            path="posts/new"
            element={
              <Lazy>
                <PostEdit />
              </Lazy>
            }
          />
          <Route
            path="posts/:id/edit"
            element={
              <Lazy>
                <PostEdit />
              </Lazy>
            }
          />
          <Route path="categories" element={<Categories />} />
          <Route path="tags" element={<Tags />} />
          <Route path="comments" element={<Comments />} />
          <Route path="media" element={<Media />} />
          <Route path="pages" element={<PageList />} />
          <Route
            path="pages/new"
            element={
              <Lazy>
                <PageEdit />
              </Lazy>
            }
          />
          <Route
            path="pages/:id/edit"
            element={
              <Lazy>
                <PageEdit />
              </Lazy>
            }
          />
          <Route path="reusable-blocks" element={<ReusableBlocks />} />

          <Route path="content-types" element={<ContentTypeList />} />
          <Route
            path="content-types/builder"
            element={<ContentTypeBuilder />}
          />
          <Route path="content-types/:singular" element={<CollectionList />} />
          <Route
            path="content-types/:singular/new"
            element={<CollectionEdit />}
          />
          <Route
            path="content-types/:singular/:id/edit"
            element={<CollectionEdit />}
          />

          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<Users />} />
          <Route path="rbac" element={<Rbac />} />
          <Route path="crons" element={<Crons />} />
          <Route path="crons/:id" element={<CronDetail />} />
          <Route path="webhooks" element={<Webhooks />} />
          <Route path="tokens" element={<Tokens />} />
          <Route path="workflows" element={<WorkflowList />} />
          <Route
            path="workflows/editor"
            element={
              <Lazy>
                <WorkflowEditor />
              </Lazy>
            }
          />
          <Route path="workflows/instances" element={<WorkflowInstances />} />
          <Route path="audit" element={<Audit />} />
          <Route path="options" element={<Options />} />
          <Route path="profile" element={<Profile />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
