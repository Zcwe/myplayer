// src/audioStore.js
import { create } from 'zustand';

// 播放模式常量（全局共享）
export const PLAY_MODE = { SEQUENCE: 'sequence', SINGLE: 'single', RANDOM: 'random' };

// 初始化模拟歌曲（全局共享，无需在组件内重复定义）
// 【修复】统一音频字段名为 url（原 audioUrl 改为 url），补充默认 cover 字段
const INIT_MOCK_SONGS = [
    {
        id: Date.now() + 1,
        name: "樱落流年",
        url: "https://freetestdata.com/wp-content/uploads/2021/09/Free_Test_Data_100KB_MP3.mp3", // 统一字段名：url
        singer: "模拟歌手·樱",
        cover: "https://picsum.photos/id/1/40/40" // 补充默认封面，避免 Avatar 无数据源
    },
    {
        id: Date.now() + 2,
        name: "策马踏歌",
        url: "https://freetestdata.com/wp-content/uploads/2021/09/Free_Test_Data_500KB_MP3.mp3", // 统一字段名：url
        singer: "模拟歌手·马",
        cover: "https://picsum.photos/id/2/40/40" // 补充默认封面
    }
];

// 创建 Zustand 全局仓库（核心：状态 + 修改方法）
// 【补全】缺失的 isPlaying、isLoading 状态，以及 togglePlay、deleteSong、addSongs 方法
export const useAudioStore = create((set, get) => ({
    // 全局状态（对应原组件内的 useState）
    currentSong: INIT_MOCK_SONGS[0],
    localMusicList: INIT_MOCK_SONGS,
    playProgress: 0,
    playMode: PLAY_MODE.SEQUENCE,
    isPlaying: false,
    isLoading: false,

    // 全局状态修改方法（供组件调用，替代原组件内的 setState）
    setCurrentSong: (song) => set({ currentSong: song }),
    setLocalMusicList: (list) => set({ localMusicList: list }),
    setPlayProgress: (progress) => set({ playProgress: progress }),
    setPlayMode: (mode) => set({ playMode: mode }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setIsLoading: (loading) => set({ isLoading: loading }),


    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),


    deleteSong: (songId) => {
        const currentState = get();
        const newMusicList = currentState.localMusicList.filter(song => song.id !== songId);

        // 若删除的是当前播放歌曲，且列表还有剩余歌曲，自动切换到第一首
        const newCurrentSong = currentState.currentSong.id === songId && newMusicList.length > 0
            ? newMusicList[0]
            : currentState.currentSong;

        set({
            localMusicList: newMusicList,
            currentSong: newCurrentSong
        });
    },

    addSongs: (newSongs) => {
        const currentState = get();
        const existingSongIds = currentState.localMusicList.map(song => song.id);

        // 过滤掉已存在的歌曲，只添加新歌曲
        const uniqueNewSongs = newSongs.filter(song => !existingSongIds.includes(song.id));
        const newMusicList = [...currentState.localMusicList, ...uniqueNewSongs];

        set({ localMusicList: newMusicList });

        // 返回添加成功的歌曲数量，供组件提示使用
        return uniqueNewSongs.length;
    }
}));