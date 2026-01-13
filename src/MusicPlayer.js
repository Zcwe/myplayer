import { useRef, useEffect, useState } from 'react';
import {
    PlayCircleOutlined, PauseCircleOutlined,
    UploadOutlined, DeleteOutlined,
    OrderedListOutlined, RedoOutlined, SwapOutlined,
    PlusOutlined, LoadingOutlined
} from '@ant-design/icons';
import { Button, Card, Input, message, Avatar } from 'antd';
import { useAudioStore, PLAY_MODE } from './audioStore';

const MusicOutlined=() => (
    <svg width="1em" height="1em" fill="currentColor" viewBox="0 0 1024 1024">
        <path d="M912 256h-56c-4.4 0-8 3.6-8 8v480c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V264c0-4.4-3.6-8-8-8zm-176 0h-56c-4.4 0-8 3.6-8 8v480c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V264c0-4.4-3.6-8-8-8zm-176 0h-56c-4.4 0-8 3.6-8 8v480c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V264c0-4.4-3.6-8-8-8zm-176 0h-56c-4.4 0-8 3.6-8 8v480c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V264c0-4.4-3.6-8-8-8zm-176 0h-56c-4.4 0-8 3.6-8 8v480c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V264c0-4.4-3.6-8-8-8z" />
    </svg>
);

const MusicPlayer=() => {
    const {
        currentSong,
        localMusicList,
        playProgress,
        playMode,
        isPlaying,
        isLoading,
        setCurrentSong,
        setPlayProgress,
        setPlayMode,
        setIsPlaying,
        setIsLoading,
        togglePlay,
        deleteSong,
        addSongs
    }=useAudioStore();

    // Refs
    const audioRef=useRef(new Audio());
    const progressBarRef=useRef(null);
    const fileInputRef=useRef(null);
    const listRef=useRef(null);
    const isGlobalEventBinded=useRef(false);
    // 【核心】单曲循环锁，与 playMode 强绑定，避免状态漂移
    const singleLoopLock=useRef({
        isLocked: false,
        lockedSongId: null
    });

    // 输入状态
    const [songName, setSongName] = useState('');
    const [songSinger, setSongSinger] = useState('');
    const [songUrl, setSongUrl] = useState('');

    // 【关键修复1】模式切换立即生效，强制同步锁状态，无需等歌曲结束
    useEffect(() => {
        if (!currentSong) {
            singleLoopLock.current={ isLocked: false, lockedSongId: null };
            return;
        }

        const isSingleMode=playMode === PLAY_MODE.SINGLE;
        singleLoopLock.current={
            isLocked: isSingleMode,
            lockedSongId: isSingleMode ? currentSong.id : null
        };

        // 切换到单曲：立即重置进度，准备循环（无需等结束）
        if (isSingleMode && isPlaying && !isLoading) {
            audioRef.current.currentTime=0;
            setPlayProgress(0);
            audioRef.current.play().catch(err => console.error('单曲循环立即生效失败:', err));
        }
        // 退出单曲：立即解锁，重置拦截逻辑
        else if (!isSingleMode && singleLoopLock.current.isLocked) {
            singleLoopLock.current={ isLocked: false, lockedSongId: null };
        }
    }, [playMode, currentSong, isPlaying, isLoading]);

    // 初始化音频
    useEffect(() => {
        if (!currentSong) {
            audioRef.current.src = '';
            setIsPlaying(false);
            setPlayProgress(0);
            singleLoopLock.current={ isLocked: false, lockedSongId: null };
            return;
        }

        setIsLoading(true);
        audioRef.current.src=currentSong.url;
        audioRef.current.load();

        const handleLoadedMetadata=() => {
            setIsLoading(false);
            setPlayProgress(0);
            if (isPlaying) {
                audioRef.current.play().catch(err => {
                    console.error('播放失败:', err);
                    setIsPlaying(false);
                });
            }
        };

        const handleAudioEnded=() => {
            if (!currentSong) return;
            handlePlayEnded();
        };

        // 先移除再绑定，避免重复监听
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.removeEventListener('ended', handleAudioEnded);
        audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.addEventListener('ended', handleAudioEnded);

        return () => {
            audioRef.current.pause();
            audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audioRef.current.removeEventListener('ended', handleAudioEnded);
        };
    }, [currentSong, isPlaying]);

    // 播放状态监听
    useEffect(() => {
        if (!currentSong || isLoading) return;

        if (isPlaying) {
            audioRef.current.play().catch(err => {
                console.error('播放失败:', err);
                setIsPlaying(false);
            });
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, currentSong, isLoading]);

    // 进度更新
    useEffect(() => {
        if (!currentSong) return;

        const updateProgress=() => {
            const duration=audioRef.current.duration;
            const currentTime=audioRef.current.currentTime;
            if (!isNaN(duration) && duration > 0 && !isNaN(currentTime)) {
                setPlayProgress((currentTime/duration)*100);
            }
        };

        audioRef.current.addEventListener('timeupdate', updateProgress);
        return () => audioRef.current.removeEventListener('timeupdate', updateProgress);
    }, [currentSong]);

    // 组件卸载清理
    useEffect(() => {
        return () => {
            if (isGlobalEventBinded.current) {
                document.removeEventListener('mousemove', handleProgressMouseMove);
                document.removeEventListener('mouseup', handleProgressMouseUp);
                isGlobalEventBinded.current=false;
            }
            audioRef.current.pause();
            audioRef.current.src = '';
            singleLoopLock.current={ isLocked: false, lockedSongId: null };
        };
    }, []);

    // 进度条拖动
    const handleProgressMouseDown=(e) => {
        if (!currentSong || isLoading || !progressBarRef.current) return;

        calculateProgress(e);
        if (!isGlobalEventBinded.current) {
            document.addEventListener('mousemove', handleProgressMouseMove);
            document.addEventListener('mouseup', handleProgressMouseUp);
            isGlobalEventBinded.current=true;
        }
    };

    const handleProgressMouseMove=(e) => {
        if (!currentSong || !progressBarRef.current) return;
        calculateProgress(e);
    };

    const handleProgressMouseUp=() => {
        if (isGlobalEventBinded.current) {
            document.removeEventListener('mousemove', handleProgressMouseMove);
            document.removeEventListener('mouseup', handleProgressMouseUp);
            isGlobalEventBinded.current=false;
        }
    };

    const calculateProgress=(e) => {
        const rect=progressBarRef.current.getBoundingClientRect();
        if (!rect || rect.width <= 0) return;

        const offsetX=Math.max(0, Math.min(e.clientX-rect.left, rect.width));
        const percent=(offsetX/rect.width)*100;
        const duration=audioRef.current.duration;

        if (!isNaN(duration) && duration > 0) {
            const seekTime=(percent/100)*duration;
            if (isFinite(seekTime)) {
                audioRef.current.currentTime=seekTime;
                setPlayProgress(percent);
            }
        }
    };

    // 格式化时间
    const formatTime=(seconds) => {
        if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
        const min=Math.floor(seconds/60);
        const sec=Math.floor(seconds % 60);
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    // 【关键修复2】播放结束处理，严格按锁状态执行，不依赖旧模式
    const handlePlayEnded=() => {
        if (!currentSong || localMusicList.length === 0) return;
        const { isLocked, lockedSongId }=singleLoopLock.current;

        if (isLocked && lockedSongId === currentSong.id) {
            // 单曲循环：立即重置进度，不切换歌曲
            audioRef.current.currentTime=0;
            setPlayProgress(0);
            if (isPlaying) {
                audioRef.current.play().catch(err => console.error('单曲循环播放失败:', err));
            }
        } else {
            // 其他模式：正常切下一首
            handleNextSong();
        }
    };

    // 【关键修复3】下一首逻辑，严格按锁状态拦截，退出单曲后立即恢复
    const handleNextSong=() => {
        if (!currentSong || localMusicList.length === 0) return;
        // 仅在单曲锁生效时拦截，退出单曲后自动放行
        if (singleLoopLock.current.isLocked) return;

        const currentIndex=localMusicList.findIndex(s => s.id === currentSong.id);
        if (currentIndex === -1) return;

        let nextIndex=0;
        const listLength=localMusicList.length;

        switch (playMode) {
            case PLAY_MODE.SEQUENCE:
                nextIndex=(currentIndex+1) % listLength;
                break;
            case PLAY_MODE.RANDOM:
                if (listLength > 1) {
                    do {
                        nextIndex=Math.floor(Math.random()*listLength);
                    } while (nextIndex === currentIndex);
                } else {
                    nextIndex=0;
                }
                break;
            default:
                nextIndex=(currentIndex+1) % listLength;
        }

        setCurrentSong(localMusicList[nextIndex]);
        setIsLoading(true);
    };

    // 选择歌曲
    const handleSelectSong=(song) => {
        if (!song || song.id === currentSong?.id) return;
        setCurrentSong(song);
        setIsLoading(true);
        // 选择新曲后同步更新单曲锁
        if (singleLoopLock.current.isLocked) {
            singleLoopLock.current.lockedSongId=song.id;
        }
    };

    // 上传/添加歌曲
    const handleUpload=() => fileInputRef.current?.click();
    const handleFileChange=(e) => {
        const files=e.target.files;
        if (!files || files.length === 0) return;

        const newSongs=Array.from(files).map(file => ({
            id: `${Date.now()}-${file.size}-${Math.random().toString(36).slice(2)}`,
            name: file.name.replace(/\.(mp3|wav|flac|aac)$/i, '') || '未知歌曲',
            singer: songSinger.trim() || '本地歌曲',
            url: URL.createObjectURL(file),
            cover: `https://picsum.photos/id/${Math.floor(Math.random()*100)}/40/40`
        }));

        const addCount=addSongs(newSongs);
        if (addCount > 0) {
            message.success(`成功上传 ${addCount} 首歌曲`);
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
        } else {
            message.info('歌曲已存在');
        }
        e.target.value = '';
    };

    const handleAddSingleSong=() => {
        const trimmedName=songName.trim();
        const trimmedUrl=songUrl.trim();
        if (!trimmedName || !trimmedUrl) {
            message.warning('请填写完整的歌曲名和音频链接');
            return;
        }

        const newSong={
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: trimmedName,
            singer: songSinger.trim() || '未知歌手',
            url: trimmedUrl,
            cover: `https://picsum.photos/id/${Math.floor(Math.random()*100)}/40/40`
        };

        const addCount=addSongs([newSong]);
        if (addCount > 0) {
            message.success(`成功添加《${trimmedName}》`);
            setSongName('');
            setSongSinger('');
            setSongUrl('');
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
        } else {
            message.info('该歌曲已存在');
        }
    };

    // 清空列表
    const handleClearList=() => {
        if (localMusicList.length === 0) {
            message.info('播放列表已为空');
            return;
        }
        setCurrentSong(null);
        setIsPlaying(false);
        setPlayProgress(0);
        singleLoopLock.current={ isLocked: false, lockedSongId: null };
        addSongs([]);
        message.info('已清空播放列表');
    };

    // 样式定义（保持不变）
    const containerStyle={
        maxWidth: 900,
        margin: '0 auto',
        padding: '20px 10px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    };

    const headerStyle={
        textAlign: 'center',
        color: '#c71585',
        marginBottom: '20px',
        fontSize: '24px'
    };

    const buttonGroupStyle={
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        justifyContent: 'center'
    };

    const timeTextStyle={
        display: 'flex',
        justifyContent: 'space-between',
        color: '#666',
        fontSize: '12px'
    };

    const progressBarStyle={
        width: '100%',
        height: '6px',
        borderRadius: '3px',
        backgroundColor: '#f0f0f0',
        position: 'relative',
        cursor: 'pointer',
        margin: '16px 0',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
    };

    const progressActiveStyle={
        height: '100%',
        borderRadius: '3px',
        background: 'linear-gradient(90deg, #ff69b4, #ff4560)',
        width: `${playProgress}%`,
        position: 'absolute',
        top: 0,
        left: 0,
        transition: 'width 0.2s ease'
    };

    const progressHandleStyle={
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: '#ff69b4',
        position: 'absolute',
        top: '50%',
        left: `${playProgress}%`,
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 2px 4px rgba(255,105,180,0.4)',
        transition: 'left 0.2s ease'
    };

    const customListContainerStyle={
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: '16px',
        marginTop: '20px'
    };

    const customListHeaderStyle={
        color: '#c71585',
        margin: 0,
        fontSize: '18px',
        marginBottom: '16px'
    };

    const customListItemStyle=(isCurrent) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isCurrent ? '#ffe4e1' : 'white',
        borderRadius: '8px',
        marginBottom: '8px',
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'background 0.2s ease'
    });

    const customListMetaStyle={
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    };

    return (
        <div style={containerStyle}>
            <h2 style={headerStyle}>🎵 轻听音乐播放器</h2>

            <div style={buttonGroupStyle}>
                <Button
                    icon={<UploadOutlined />}
                    onClick={handleUpload}
                    style={{ background: '#ff69b4', border: 'none', color: 'white' }}
                >
                    上传本地歌曲
                </Button>
                <Button
                    icon={<DeleteOutlined />}
                    onClick={handleClearList}
                    style={{ background: '#ff4560', border: 'none', color: 'white' }}
                >
                    清空列表
                </Button>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Input
                        placeholder="歌曲名"
                        value={songName}
                        onChange={(e) => setSongName(e.target.value)}
                        style={{ width: '120px', borderRadius: '6px' }}
                        maxLength={30}
                    />
                    <Input
                        placeholder="歌手"
                        value={songSinger}
                        onChange={(e) => setSongSinger(e.target.value)}
                        style={{ width: '120px', borderRadius: '6px' }}
                        maxLength={20}
                    />
                    <Input
                        placeholder="音频链接"
                        value={songUrl}
                        onChange={(e) => setSongUrl(e.target.value)}
                        style={{ width: '200px', borderRadius: '6px' }}
                        maxLength={100}
                    />
                    <Button
                        icon={<PlusOutlined />}
                        onClick={handleAddSingleSong}
                        style={{ background: '#32cd32', border: 'none', color: 'white' }}
                    >
                        添加
                    </Button>
                </div>

                <input
                    type="file"
                    accept="audio/mp3,audio/wav,audio/flac,audio/aac"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </div>

            {currentSong && (
                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Avatar src={currentSong.cover} size={32} icon={<MusicOutlined />} />
                            <span>当前播放：{currentSong.name}</span>
                        </div>
                    }
                    extra={<span style={{ color: '#666' }}>歌手：{currentSong.singer}</span>}
                    style={{
                        background: 'linear-gradient(145deg, #fff0f5, #ffe4e1)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(255,105,180,0.15)',
                        marginBottom: '20px'
                    }}
                >
                    <div style={timeTextStyle}>
                        <span>{formatTime(audioRef.current.currentTime)}</span>
                        <span>{formatTime(audioRef.current.duration)}</span>
                    </div>
                    <div
                        ref={progressBarRef}
                        onMouseDown={handleProgressMouseDown}
                        style={progressBarStyle}
                    >
                        <div style={progressActiveStyle} />
                        <div style={progressHandleStyle} />
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <Button
                            icon={isLoading ? <LoadingOutlined spin /> : (isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />)}
                            onClick={() => {
                                if (!currentSong || isLoading) return;
                                togglePlay();
                            }}
                            size="large"
                            style={{
                                background: isPlaying ? '#ff4560' : '#ff69b4',
                                border: 'none',
                                color: 'white',
                                borderRadius: '8px',
                                marginRight: '10px'
                            }}
                        >
                            {isPlaying ? '暂停' : '播放'}
                        </Button>

                        <Button
                            icon={<OrderedListOutlined />}
                            onClick={() => {
                                setPlayMode(PLAY_MODE.SEQUENCE);
                                message.success('已切换为顺序播放');
                            }}
                            style={{
                                background: playMode === PLAY_MODE.SEQUENCE ? 'linear-gradient(90deg, #e66465, #9198e5)' : '#f0f0f0',
                                color: playMode === PLAY_MODE.SEQUENCE ? 'white' : '#666',
                                border: 'none',
                                borderRadius: '8px',
                                margin: '0 5px'
                            }}
                        >
                            顺序
                        </Button>
                        <Button
                            icon={<RedoOutlined />}
                            onClick={() => {
                                setPlayMode(PLAY_MODE.SINGLE);
                                message.success('已切换为单曲循环（立即生效）');
                            }}
                            style={{
                                background: playMode === PLAY_MODE.SINGLE ? 'linear-gradient(90deg, #e66465, #9198e5)' : '#f0f0f0',
                                color: playMode === PLAY_MODE.SINGLE ? 'white' : '#666',
                                border: 'none',
                                borderRadius: '8px',
                                margin: '0 5px'
                            }}
                        >
                            单曲
                        </Button>
                        <Button
                            icon={<SwapOutlined />}
                            onClick={() => {
                                setPlayMode(PLAY_MODE.RANDOM);
                                message.success('已切换为随机播放');
                            }}
                            style={{
                                background: playMode === PLAY_MODE.RANDOM ? 'linear-gradient(90deg, #e66465, #9198e5)' : '#f0f0f0',
                                color: playMode === PLAY_MODE.RANDOM ? 'white' : '#666',
                                border: 'none',
                                borderRadius: '8px',
                                margin: '0 5px'
                            }}
                        >
                            随机
                        </Button>
                    </div>
                </Card>
            )}

            <div ref={listRef} style={customListContainerStyle}>
                <h3 style={customListHeaderStyle}>播放列表（{localMusicList.length} 首）</h3>

                {localMusicList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        <p>播放列表为空</p>
                        <p>点击「上传本地歌曲」或「添加」按钮添加音乐吧～</p>
                    </div>
                ) : (
                    <div>
                        {localMusicList.map((song) => (
                            <div
                                key={song.id}
                                style={customListItemStyle(currentSong?.id === song.id)}
                                onClick={() => handleSelectSong(song)}
                            >
                                <div style={customListMetaStyle}>
                                    <Avatar src={song.cover} size={36} fallback={<MusicOutlined />} />
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{song.name}</div>
                                        <div style={{ color: '#666', fontSize: '12px' }}>歌手：{song.singer}</div>
                                    </div>
                                </div>
                                <DeleteOutlined
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSong(song.id);
                                        message.success('已删除歌曲');

                                        if (localMusicList.length === 1) {
                                            setCurrentSong(null);
                                            setIsPlaying(false);
                                            setPlayProgress(0);
                                            singleLoopLock.current={ isLocked: false, lockedSongId: null };
                                        }
                                    }}
                                    style={{ color: '#ff4560', cursor: 'pointer' }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MusicPlayer;