/**
 * 任务视频奖励源：45 个网易 VOD 入口地址。
 *
 * 注意存的是 VOD 入口 URL，不是签名后的 MP4 直链——入口每次访问会 302 跳转到
 * 真实地址（带短时 auth_key），所以这里不解析直链，交给 <video> 标签自己跟 302。
 */

/** 看满 30 秒（有效播放时长）才发奖。 */
export const VIDEO_REWARD_WATCH_MS = 30_000;

export const VIDEO_REWARD_SOURCES = [
  'https://vod.cc.163.com/file/6a6af0a28896cbf7d0edadea?biz_tag=da_7a668862-3d19-4538-8636-181879711ddf',
  'https://vod.cc.163.com/file/6a6af1f78896cbf7d0edaedf?biz_tag=da_ebd28c4c-885a-4765-9c1e-7300df16873d',
  'https://vod.cc.163.com/file/6a6af20c8896cbf7d0edaeef?biz_tag=da_52a6052f-4138-4d7b-a2e0-94fbb1db5b9e',
  'https://vod.cc.163.com/file/6a6af2632c5fe7a06c2f2b5b?biz_tag=da_30a0aae7-21f4-4c01-8e8a-938bace2fd6e',
  'https://vod.cc.163.com/file/6a6af27d2c5fe7a06c2f2b6f?biz_tag=da_46c60069-55c8-40a3-a5b8-491361d3e557',
  'https://vod.cc.163.com/file/6a6af2a38896cbf7d0edaf59?biz_tag=da_ed8f02e1-42f2-407f-8d34-5b8afa73a381',
  'https://vod.cc.163.com/file/6a6af2cd2c5fe7a06c2f2bb1?biz_tag=da_c73ec2b1-3a9b-4921-9af6-282929e76288',
  'https://vod.cc.163.com/file/6a6af4878896cbf7d0edb0cf?biz_tag=da_0670e461-44c0-4f81-938a-a1764e3fc07a',
  'https://vod.cc.163.com/file/6a6af4ad2c5fe7a06c2f2d1c?biz_tag=da_01a3814f-ebad-45d8-874c-15e69b3f4056',
  'https://vod.cc.163.com/file/6a6af4dd2c5fe7a06c2f2d42?biz_tag=da_e76892b8-8f2c-4c39-9d18-a4f8dddebfe5',
  'https://vod.cc.163.com/file/6a6af5492c5fe7a06c2f2d99?biz_tag=da_6e9257af-c4f1-4172-b33c-6a7d104d76b4',
  'https://vod.cc.163.com/file/6a6af55e8896cbf7d0edb162?biz_tag=da_f6b4477c-faff-4cfe-9402-7eaf3f899a1c',
  'https://vod.cc.163.com/file/6a6af5a82c5fe7a06c2f2dec?biz_tag=da_03930992-460d-4a7b-95b9-0d90bbd2fe13',
  'https://vod.cc.163.com/file/6a70947c8896cbf7d0f18d7a?biz_tag=da_e6de1aa3-c914-43ab-8a86-549bdc87acda',
  'https://vod.cc.163.com/file/6a70949d8896cbf7d0f18d9e?biz_tag=da_3a5681e6-dbd9-4200-b570-b77167912ac8',
  'https://vod.cc.163.com/file/6a7094c52c5fe7a06c33061e?biz_tag=da_852266f9-b088-41df-9a06-85cb6c6a7177',
  'https://vod.cc.163.com/file/6a7095078896cbf7d0f18dec?biz_tag=da_08d7fe56-07ad-4f9f-b0c6-226bbd910b21',
  'https://vod.cc.163.com/file/6a7095392c5fe7a06c330683?biz_tag=da_16ed514d-d59d-42d7-8b20-a3b8d938a00b',
  'https://vod.cc.163.com/file/6a7095608896cbf7d0f18e35?biz_tag=da_a652a66d-c715-415d-a84d-ef7e41d521ca',
  'https://vod.cc.163.com/file/6a7095802c5fe7a06c3306be?biz_tag=da_b51a30ab-f774-4498-9f46-48b21ce06c76',
  'https://vod.cc.163.com/file/6a7148282c5fe7a06c337cd3?biz_tag=da_61fdc9bf-7216-4155-986c-c6a418ff7d85',
  'https://vod.cc.163.com/file/6a7148602c5fe7a06c337d03?biz_tag=da_79c51f45-5420-49bb-856d-56494100dbf4',
  'https://vod.cc.163.com/file/6a7148848896cbf7d0f20537?biz_tag=da_8f25b2c0-636e-4154-a94a-dbe2fa988fe0',
  'https://vod.cc.163.com/file/6a7148bf8896cbf7d0f20553?biz_tag=da_8d0ad9bf-3352-43db-86ea-f490e0396589',
  'https://vod.cc.163.com/file/6a7149148896cbf7d0f20588?biz_tag=da_43d2a32f-aaae-40df-a7b9-be640a4bc071',
  'https://vod.cc.163.com/file/6a7149418896cbf7d0f205ae?biz_tag=da_78adb5c2-42e3-41d5-a2a3-332a5a89a733',
  'https://vod.cc.163.com/file/6a7149698896cbf7d0f205ca?biz_tag=da_a9e229ba-a107-4581-9cc1-2c9168bf24c8',
  'https://vod.cc.163.com/file/6a71499d8896cbf7d0f205ed?biz_tag=da_2d60392b-7420-4129-8dee-edc5a9ba566f',
  'https://vod.cc.163.com/file/6a7149c32c5fe7a06c337df1?biz_tag=da_00606c3d-a218-44ef-9bfb-1d8a2a314b25',
  'https://vod.cc.163.com/file/6a714a118896cbf7d0f20661?biz_tag=da_bfc9833d-5495-4ddf-8df4-ce94db278dbf',
  'https://vod.cc.163.com/file/6a714a498896cbf7d0f20687?biz_tag=da_7504d2ce-d092-47c4-b43c-1aaaecada4f6',
  'https://vod.cc.163.com/file/6a714a642c5fe7a06c337e67?biz_tag=da_270faf40-d5f1-4cd6-8510-3d79d2993e7c',
  'https://vod.cc.163.com/file/6a714a8e2c5fe7a06c337e91?biz_tag=da_a9b4f171-9782-4fa1-beeb-1a7a13afa35a',
  'https://vod.cc.163.com/file/6a714ab82c5fe7a06c337eb3?biz_tag=da_8b8724d5-669a-48a5-bbc5-8157c4ae5aa4',
  'https://vod.cc.163.com/file/6a714ae08896cbf7d0f206f4?biz_tag=da_41d3eee5-afab-4193-8833-720c4ed829e1',
  'https://vod.cc.163.com/file/6a714b0c2c5fe7a06c337eef?biz_tag=da_f4cbeb9b-a8e2-4e2d-a16d-1d33626e328c',
  'https://vod.cc.163.com/file/6a714b5c8896cbf7d0f20753?biz_tag=da_962e9887-b058-4a20-bb09-200969b707d8',
  'https://vod.cc.163.com/file/6a714b9a2c5fe7a06c337f54?biz_tag=da_737141b1-fcbe-4cd4-9097-a1a0d47c2825',
  'https://vod.cc.163.com/file/6a714bba8896cbf7d0f20790?biz_tag=da_9a0d385d-114a-49c6-b34a-b17bd00ec472',
  'https://vod.cc.163.com/file/6a714c052c5fe7a06c337fac?biz_tag=da_9c0355c0-aa07-4211-acaf-b5817ddd02b7',
  'https://vod.cc.163.com/file/6a714c922c5fe7a06c33800a?biz_tag=da_fafcee30-f14d-41c2-8c97-aea144412a70',
  'https://vod.cc.163.com/file/6a714cbc2c5fe7a06c338029?biz_tag=da_53807851-fb43-44fe-bf31-7c49c1ea4c9a',
  'https://vod.cc.163.com/file/6a714cf82c5fe7a06c33805d?biz_tag=da_8c50fe40-c4d9-4974-baa1-e96caaaa46cf',
  'https://vod.cc.163.com/file/6a714d538896cbf7d0f208b8?biz_tag=da_9d95b7e3-53a9-4574-9c09-cddd1d83a765',
  'https://vod.cc.163.com/file/6a714d752c5fe7a06c3380c1?biz_tag=da_324f9fe3-d09a-49ac-9f88-e5116dce0eeb',
  'https://vod.cc.163.com/file/6a714d9b2c5fe7a06c3380e2?biz_tag=da_e9da3910-ec7d-497f-8b1e-182c7cca481d',
] as const;

/** 随机选一只任务视频。 */
export function randomVideoRewardSource(): string {
  const index = Math.floor(Math.random() * VIDEO_REWARD_SOURCES.length);
  return VIDEO_REWARD_SOURCES[index];
}

/** 播完/换源时随机切下一只，排除当前这只。 */
export function nextVideoRewardSource(current: string): string {
  const candidates = VIDEO_REWARD_SOURCES.filter((source) => source !== current);
  const pool = candidates.length ? candidates : VIDEO_REWARD_SOURCES;
  return pool[Math.floor(Math.random() * pool.length)];
}

let prefetchVideo: HTMLVideoElement | null = null;

/**
 * 单只视频约十几 MB：进首页 / 开局后的前台空闲时段，用隐藏 <video preload="auto">
 * 提前把流拉进 HTTP 缓存，真正点开时基本秒开。只预取一只，避免占满移动端带宽。
 */
export function prefetchVideoRewardSource(): void {
  if (typeof document === 'undefined') return;
  const run = () => {
    if (prefetchVideo) return;
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = randomVideoRewardSource();
    video.style.display = 'none';
    prefetchVideo = video;
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 4000 });
  } else {
    window.setTimeout(run, 2000);
  }
}
