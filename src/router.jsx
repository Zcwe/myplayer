import { createHashRouter, RouterProvider, Outlet, Link } from 'react-router-dom';
import MusicPlayer from './MusicPlayer';
import { Layout, Menu } from 'antd';
import { AudioOutlined, InfoCircleOutlined } from '@ant-design/icons';

const RootLayout = () => {
    const { Header, Content } = Layout;

    const menuItems = [
        {
            key: '/',
            icon: <AudioOutlined />,
            label: <Link to="/">音乐播放器</Link>,
        },
        {
            key: '/about',
            icon: <InfoCircleOutlined />,
            label: <Link to="/about">关于我们</Link>,
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ background: '#fff', padding: '0 20px' }}>
                <Menu mode="horizontal" selectedKeys={['/']} items={menuItems} />
            </Header>
            <Content style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                <Outlet />
            </Content>
        </Layout>
    );
};

// 核心修改：1. createBrowserRouter → createHashRouter  2. 新增 {basename: "/myplayer"} 第二个参数
const router = createHashRouter(
    [
        {
            path: '/',
            element: <RootLayout />,
            children: [
                { path: '/', element: <MusicPlayer /> },
                {
                    path: '/about',
                    element: (
                        <div style={{ maxWidth: 700, margin: '0 auto' }}>
                            <h2 style={{ textAlign: 'center', color: '#c71585', marginTop: 20 }}>
                                关于我们：基于 React 技术栈打造的音乐播放器
                            </h2>
                            <p style={{ textAlign: 'center', color: '#666', margin: '10px auto', lineHeight: '1.6' }}>
                                <strong>实现思路：</strong>以「轻量易用、功能闭环」为核心，先搭建基础播放框架，实现本地音频上传与在线单曲添加，再完善播放列表管理（增删、去重、持久化基础），最后补充播放模式切换、进度条拖动、自动切歌等交互优化，逐步从「能用」迭代到「好用」，兼顾用户体验与功能完整性。
                            </p>
                            <p style={{ textAlign: 'center', color: '#666', margin: '10px auto', lineHeight: '1.6' }}>
                                <strong>使用技术：</strong>核心基于 React Hooks（useState/useRef/useEffect）实现状态管理与生命周期控制，采用 Ant Design 组件库快速搭建美观界面，借助原生 JavaScript 鼠标事件与音频 API 实现进度条拖动、播放控制等核心功能，无额外复杂框架，保证项目轻量可维护。
                            </p>
                            <p style={{ textAlign: 'center', color: '#666', margin: '10px auto', lineHeight: '1.6' }}>
                                <strong>开发感想：</strong>从简单的播放功能到完整的播放器，深刻体会到「细节决定体验」，看似简单的进度条拖动，需要兼顾兼容性、音频加载状态与交互流畅度；同时也感受到 React 组件化与 Hooks 的便捷性，能够快速拆分功能、管理状态，让开发过程更高效。
                            </p>
                        </div>
                    )
                }
            ]
        }
    ],
    { basename: "/myplayer" } // ✅ 重中之重：适配GitHub Pages仓库子路径，必须加！
);

const AppRouter = () => <RouterProvider router={router} />;
export default AppRouter;
