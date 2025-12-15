export const DEMO_PYTHON_DATA = `
# This is a Python dictionary with various types
{
    'project': 'MotherDuck Clone',
    'active': True,
    'meta': {
        'id': 1024,
        'tags': {'ai', 'react', 'python'},  # A Set
        'location': None,
        'coordinates': (37.7749, -122.4194) # A Tuple
    },
    'users': [
        {
            'id': 1,
            'name': 'Alice',
            'roles': ['admin', 'editor']
        },
        {
            'id': 2,
            'name': 'Bob',
            'roles': ['viewer']
        }
    ],
    'settings': {
        'theme': 'dark',
        'notifications': False,
        'retry_count': 3
    }
}
`;

// Simulated list of other tools in your station
export const OTHER_TOOLS = [];

export const TRANSLATIONS = {
  en: {
    nav: {
      home: "Home",
      subtitle: "CONVERTER",
      localEngine: "LOCAL_ENGINE",
      docs: "DOCS",
      moreTools: "More Tools",
      underDevelopment: "Under Development...",
      feedback: "Feedback",
    },
    input: {
      title: "Input",
      loadDemo: "Load Demo",
      placeholder: "# Paste Python dict/list here...",
      convert: "CONVERT",
      waiting: "WAITING FOR INPUT",
      parseError: "Parse Error",
    },
    output: {
      title: "Output",
      tree: "TREE",
      raw: "RAW",
      filter: "Filter...",
      copy: "Copy JSON",
      enableWrap: "Enable Word Wrap",
      disableWrap: "Disable Word Wrap",
      compact: "Compact",
      expand: "Format",
      matches: "{current}/{total}",
      searchTooMany: "Too many matches (> {limit}). Refine filter.",
      searchTooLarge: "Search limited due to payload size. Refine filter.",
      searchTooWide:
        "Too many sections to auto-expand. Showing partial results.",
    },
    footer: {
      ready: "SYSTEM READY",
      keysFound: "{count} KEYS FOUND",
      utf8: "UTF-8",
      json: "JSON",
      reportBug: "Report Bug / Request Feature",
    },
    node: {
      showMore: "SHOW MORE",
      remaining: "{count} REMAINING",
      valueTruncated: "Value truncated",
      copyValue: "Copy value",
    },
  },
  zh: {
    nav: {
      home: "首页",
      subtitle: "转换器",
      localEngine: "本地引擎",
      docs: "文档",
      moreTools: "更多工具",
      underDevelopment: "开发中开发中...",
      feedback: "反馈",
    },
    input: {
      title: "输入",
      loadDemo: "加载示例",
      placeholder: "# 在此粘贴 Python 字典/列表...",
      convert: "转换",
      waiting: "等待输入",
      parseError: "解析错误",
    },
    output: {
      title: "输出",
      tree: "树状图",
      raw: "源文本",
      filter: "过滤...",
      copy: "复制 JSON",
      enableWrap: "启用自动换行",
      disableWrap: "禁用自动换行",
      compact: "压缩",
      expand: "格式化",
      matches: "{current}/{total}",
      searchTooMany: "匹配结果过多(>{limit})，请缩小筛选范围。",
      searchTooLarge: "数据量过大，筛选被限制，请缩小范围。",
      searchTooWide: "展开范围过大，已部分展示，请进一步筛选。",
    },
    footer: {
      ready: "系统就绪",
      keysFound: "已识别 {count} 个键",
      utf8: "UTF-8",
      json: "JSON",
      reportBug: "报告问题 / 功能建议",
    },
    node: {
      showMore: "显示更多",
      remaining: "剩余 {count} 个",
      valueTruncated: "值已截断",
      copyValue: "复制值",
    },
  },
};
