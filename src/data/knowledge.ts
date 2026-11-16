import type { KnowledgePoint, KnowledgeChunk } from '../types';

/** 知识点图谱：24 个 Python 入门知识点，prereq 构成先修 DAG（技术文档 4.9） */
export const KNOWLEDGE_GRAPH: KnowledgePoint[] = [
  { id: 'kp_print', name: '输出与 print', domain: '基础语法', prereq: [], difficulty: 1, pInit: 0.72, description: '使用 print 输出结果与格式化' },
  { id: 'kp_var', name: '变量与赋值', domain: '基础语法', prereq: ['kp_print'], difficulty: 1, pInit: 0.68, description: '变量命名、赋值与引用' },
  { id: 'kp_type', name: '基本数据类型', domain: '基础语法', prereq: ['kp_var'], difficulty: 1, pInit: 0.55, description: 'int / float / str / bool 及类型转换' },
  { id: 'kp_op', name: '运算符与表达式', domain: '基础语法', prereq: ['kp_type'], difficulty: 1, pInit: 0.60, description: '算术、比较、逻辑运算与优先级' },
  { id: 'kp_input', name: '输入与类型转换', domain: '基础语法', prereq: ['kp_type'], difficulty: 2, pInit: 0.48, description: 'input() 返回字符串，需显式转换' },
  { id: 'kp_if', name: '条件分支 if', domain: '流程控制', prereq: ['kp_op'], difficulty: 2, pInit: 0.58, description: 'if / elif / else 与缩进块' },
  { id: 'kp_bool', name: '布尔与短路求值', domain: '流程控制', prereq: ['kp_op'], difficulty: 2, pInit: 0.45, description: 'and / or / not 的真值规则' },
  { id: 'kp_for', name: 'for 循环与 range', domain: '流程控制', prereq: ['kp_if'], difficulty: 2, pInit: 0.52, description: '遍历序列与 range 边界' },
  { id: 'kp_while', name: 'while 循环', domain: '流程控制', prereq: ['kp_if'], difficulty: 2, pInit: 0.44, description: '循环条件与终止、避免死循环' },
  { id: 'kp_break', name: 'break / continue', domain: '流程控制', prereq: ['kp_for'], difficulty: 2, pInit: 0.41, description: '循环控制语句' },
  { id: 'kp_nested', name: '嵌套循环', domain: '流程控制', prereq: ['kp_for'], difficulty: 3, pInit: 0.33, description: '多重循环与内外层变量' },
  { id: 'kp_list', name: '列表与索引', domain: '数据结构', prereq: ['kp_for'], difficulty: 2, pInit: 0.50, description: '列表创建、下标从 0 开始、负索引' },
  { id: 'kp_index', name: '索引越界', domain: '数据结构', prereq: ['kp_list'], difficulty: 2, pInit: 0.28, description: 'IndexError 成因与边界检查' },
  { id: 'kp_slice', name: '切片', domain: '数据结构', prereq: ['kp_list'], difficulty: 3, pInit: 0.36, description: 'list[a:b] 左闭右开' },
  { id: 'kp_listmethod', name: '列表常用方法', domain: '数据结构', prereq: ['kp_list'], difficulty: 2, pInit: 0.42, description: 'append / pop / len / sort' },
  { id: 'kp_str', name: '字符串操作', domain: '数据结构', prereq: ['kp_type'], difficulty: 2, pInit: 0.51, description: '拼接、索引、常用方法' },
  { id: 'kp_dict', name: '字典', domain: '数据结构', prereq: ['kp_list'], difficulty: 3, pInit: 0.34, description: '键值对、KeyError、遍历' },
  { id: 'kp_func', name: '函数定义与调用', domain: '函数', prereq: ['kp_if'], difficulty: 2, pInit: 0.46, description: 'def、参数、return 与作用域' },
  { id: 'kp_return', name: '返回值与 None', domain: '函数', prereq: ['kp_func'], difficulty: 3, pInit: 0.30, description: '忘记 return 导致 None' },
  { id: 'kp_scope', name: '变量作用域', domain: '函数', prereq: ['kp_func'], difficulty: 3, pInit: 0.27, description: '局部/全局变量、global' },
  { id: 'kp_exception', name: '异常与 try', domain: '调试', prereq: ['kp_func'], difficulty: 3, pInit: 0.25, description: '读 traceback、try/except' },
  { id: 'kp_indent', name: '缩进与代码块', domain: '调试', prereq: ['kp_if'], difficulty: 1, pInit: 0.40, description: 'IndentationError 与冒号' },
  { id: 'kp_nameerr', name: 'NameError 与拼写', domain: '调试', prereq: ['kp_var'], difficulty: 1, pInit: 0.38, description: '未定义变量、大小写敏感' },
  { id: 'kp_zero', name: '除零与边界', domain: '调试', prereq: ['kp_op'], difficulty: 2, pInit: 0.32, description: 'ZeroDivisionError 与前置判断' },
];

export const KP_MAP: Record<string, KnowledgePoint> = Object.fromEntries(
  KNOWLEDGE_GRAPH.map((k) => [k.id, k]),
);

/** 课程讲义切片：RAG 语料（技术文档 4.7）。MVP 阶段用本地加权检索代替向量库。 */
export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  { id: 'src_01', kpId: 'kp_index', title: '《Python 入门》3.2 列表下标', text: '列表下标从 0 开始，长度为 n 的列表合法下标是 0 到 n-1。访问 lst[n] 会抛出 IndexError: list index out of range。使用 range(len(lst)) 时，range 同样不含右端点。', keywords: ['IndexError', '越界', '下标', 'range', 'len', 'list index out of range'] },
  { id: 'src_02', kpId: 'kp_for', title: '《Python 入门》4.1 for 与 range', text: 'range(a, b) 生成 a 到 b-1 的整数序列，不含 b。遍历列表时优先直接 for x in lst，可从根本上避免下标越界。', keywords: ['range', 'for', '遍历', '不含右端点', '边界'] },
  { id: 'src_03', kpId: 'kp_type', title: '《Python 入门》2.3 类型转换', text: 'input() 永远返回字符串。若直接与整数相加会抛 TypeError: can only concatenate str (not "int") to str。必须先 int(x) 或 str(x) 显式转换。', keywords: ['TypeError', 'input', '字符串', '整数', '转换', 'int', 'str'] },
  { id: 'src_04', kpId: 'kp_op', title: '《Python 入门》2.4 运算规则', text: '整数与字符串不能直接相加；+ 对字符串表示拼接，对数值表示求和。混合类型运算前需统一类型。', keywords: ['TypeError', '加号', '拼接', '混合类型'] },
  { id: 'src_05', kpId: 'kp_indent', title: '《实验指导》1.4 缩进与冒号', text: 'if / for / while / def 语句行末必须有冒号，其下一行开始的代码块必须统一缩进（推荐 4 个空格）。混用 Tab 与空格会触发 IndentationError 或 TabError。', keywords: ['IndentationError', '缩进', '冒号', 'Tab', '代码块'] },
  { id: 'src_06', kpId: 'kp_nameerr', title: '《实验指导》1.5 标识符', text: 'Python 区分大小写。使用未赋值的变量名会抛 NameError: name ... is not defined。常见原因是拼写不一致或变量定义在函数内部。', keywords: ['NameError', '未定义', '大小写', '拼写', 'is not defined'] },
  { id: 'src_07', kpId: 'kp_return', title: '《Python 入门》6.2 返回值', text: '函数若没有显式 return，默认返回 None。把 None 参与算术或字符串操作会引发 TypeError。调用有返回值的函数时，需要用变量接收结果。', keywords: ['None', 'return', 'TypeError', '函数', '返回值'] },
  { id: 'src_08', kpId: 'kp_zero', title: '《实验指导》3.1 边界检查', text: '除法前应判断分母是否为 0。ZeroDivisionError 通常出现在循环或用户输入场景，可用条件分支提前拦截。', keywords: ['ZeroDivisionError', '除零', '分母', '边界'] },
  { id: 'src_09', kpId: 'kp_slice', title: '《Python 入门》3.4 切片', text: 'lst[a:b] 取下标 a 到 b-1，左闭右开。省略 a 表示从头，省略 b 表示到末尾。切片越界不会报错，会静默截断。', keywords: ['切片', '左闭右开', 'a:b', '截断'] },
  { id: 'src_10', kpId: 'kp_dict', title: '《Python 入门》5.1 字典', text: '用 d[key] 访问不存在的键会抛 KeyError，可用 d.get(key, default) 或 in 判断规避。遍历字典默认遍历键。', keywords: ['KeyError', 'get', '字典', '键'] },
  { id: 'src_11', kpId: 'kp_func', title: '《Python 入门》6.1 函数', text: '形参是函数定义时的占位名，实参是调用时传入的值。函数体必须缩进，调用时参数个数与顺序要匹配。', keywords: ['函数', '形参', '实参', 'def', '参数'] },
  { id: 'src_12', kpId: 'kp_exception', title: '《调试手册》1.1 读 traceback', text: 'traceback 从下往上看：最后一行是异常类型与消息，往上依次是调用栈和出错行号。先定位异常类型，再回到对应行检查变量状态。', keywords: ['traceback', '异常类型', '行号', '调用栈', '调试'] },
  { id: 'src_13', kpId: 'kp_list', title: '《Python 入门》3.1 列表', text: 'len(lst) 返回元素个数，最后一个元素的下标是 len(lst)-1。负索引 -1 表示最后一个元素。', keywords: ['len', '负索引', '列表', '长度'] },
  { id: 'src_14', kpId: 'kp_listmethod', title: '《Python 入门》3.3 常用方法', text: 'append 原地追加并返回 None；pop 删除并返回元素；sort 原地排序返回 None。把它们赋给变量会得到 None。', keywords: ['append', 'pop', 'sort', 'None', '原地'] },
  { id: 'src_15', kpId: 'kp_while', title: '《Python 入门》4.3 while', text: 'while 循环必须在循环体内更新条件变量，否则会形成死循环。执行环境通常会设置超时中断。', keywords: ['while', '死循环', '超时', '条件变量'] },
  { id: 'src_16', kpId: 'kp_bool', title: '《Python 入门》2.5 布尔运算', text: 'and / or 采用短路求值。0、空字符串、空列表在布尔上下文中视为 False，其余多数对象视为 True。', keywords: ['布尔', 'and', 'or', '短路', '真值'] },
  { id: 'src_17', kpId: 'kp_nested', title: '《实验指导》4.2 嵌套循环', text: '外层循环每执行一次，内层循环完整跑一轮。内外层循环变量不要重名，否则会相互覆盖。', keywords: ['嵌套', '外层', '内层', '循环变量'] },
  { id: 'src_18', kpId: 'kp_str', title: '《Python 入门》2.6 字符串', text: '字符串不可变，索引同样从 0 开始。f-string 可直接在字符串中嵌入表达式，避免手动类型转换。', keywords: ['字符串', '不可变', 'f-string', '格式化'] },
  { id: 'src_19', kpId: 'kp_scope', title: '《Python 入门》6.3 作用域', text: '在函数内赋值会创建局部变量；若要修改全局变量需 global 声明。读取全局变量不需要声明。', keywords: ['作用域', '局部', '全局', 'global'] },
  { id: 'src_20', kpId: 'kp_if', title: '《Python 入门》4.0 条件分支', text: 'elif 可接多个分支，else 可选。判断相等用 ==，单等号 = 是赋值语句，在条件中直接使用会报 SyntaxError。', keywords: ['if', 'elif', '等于', '==', '赋值'] },
  { id: 'src_21', kpId: 'kp_break', title: '《实验指导》4.1 循环控制', text: 'break 立即结束整个循环，continue 跳过本轮剩余语句进入下一轮。二者只作用于最近一层循环。', keywords: ['break', 'continue', '跳过', '结束'] },
  { id: 'src_22', kpId: 'kp_input', title: '《实验指导》2.1 用户输入', text: 'input() 的返回值始终是 str，即使输入的是数字。做数值计算前必须转换，并考虑非法输入的异常处理。', keywords: ['input', 'str', '数字', '转换'] },
  { id: 'src_23', kpId: 'kp_var', title: '《Python 入门》2.1 变量', text: '变量名由字母、数字、下划线组成，不能以数字开头，不能使用关键字。赋值即创建。', keywords: ['变量', '命名', '赋值', '关键字'] },
  { id: 'src_24', kpId: 'kp_print', title: '《Python 入门》1.2 输出', text: 'print 可接收多个参数，默认用空格分隔、以换行结尾。可用 sep 和 end 自定义。', keywords: ['print', '输出', 'sep', 'end'] },
];

export const DOMAINS = ['基础语法', '流程控制', '数据结构', '函数', '调试'] as const;
