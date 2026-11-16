import type { SampleCase } from '../types';

/**
 * 典型错误样例（技术文档 4.12 离线评测集的演示子集）。
 * hints 为 L1→L4 分层脚手架：L1 只定位、L2 讲概念、L3 给最小反例、L4 才给参考实现。
 * reference 仅在学生显式「请求揭晓」时展示，正常引导轮次绝不出现。
 */
export const SAMPLES: SampleCase[] = [
  {
    id: 'case_index',
    title: '① 列表求和越界',
    kpId: 'kp_index',
    errorType: 'IndexError',
    concept: 'range 不含右端点，len(lst) 不是合法下标',
    prompt: '我想把成绩列表里的分数加起来，但一运行就报错，请帮我看看。',
    starterCode: `def total_score(scores):
    total = 0
    for i in range(len(scores) + 1):
        total = total + scores[i]
    return total

print(total_score([88, 92, 75]))`,
    brokenLine: 3,
    tests: [
      { name: '三个分数求和', call: 'total_score([88, 92, 75])', expect: '255' },
      { name: '单个分数', call: 'total_score([10])', expect: '10' },
      { name: '空列表', call: 'total_score([])', expect: '0' },
    ],
    hints: [
      '先别急着改代码。第 3 行的循环，一共会执行几次？而 scores 这个列表，合法的下标最大是几？把这两个数字分别算出来告诉我。',
      'traceback 说 IndexError: list index out of range。len(scores) 是元素个数，但下标是从 0 开始编号的，所以最后一个元素的下标是 len(scores)-1。range(a, b) 同样不包含 b 本身。',
      '可以在纸上试一个小例子：lst = [10, 20, 30]，len(lst) 是 3，但 lst[3] 会怎样？另外，如果不写下标、直接 for x in lst 遍历，还需要担心越界吗？',
      '参考实现：把第 3 行改成 `for i in range(len(scores)):`，或更简洁地写成 `for s in scores: total += s`。',
    ],
    reference: `def total_score(scores):
    total = 0
    for s in scores:
        total += s
    return total`,
  },
  {
    id: 'case_type',
    title: '② 字符串与整数相加',
    kpId: 'kp_type',
    errorType: 'TypeError',
    concept: '不同类型不能直接相加，需显式转换或格式化',
    prompt: '这个函数想拼出「姓名：分数」，为什么报 TypeError？',
    starterCode: `def format_score(name, score):
    return name + "：" + score

print(format_score("小明", 95))`,
    brokenLine: 2,
    tests: [
      { name: '小明 95 分', call: 'format_score("小明", 95)', expect: '小明：95' },
      { name: '小红 100 分', call: 'format_score("小红", 100)', expect: '小红：100' },
      { name: '零分', call: 'format_score("小刚", 0)', expect: '小刚：0' },
    ],
    hints: [
      '看第 2 行：加号两边分别是什么类型？name、冒号、score 三者里，有没有哪个和别人不一样？',
      'TypeError: can only concatenate str (not "int") to str 的意思是「只能把字符串拼到字符串上」。+ 对字符串是拼接，对数字是求和，两边类型必须一致。',
      '试试在交互式环境里分别求 `"分值：" + 95` 和 `"分值：" + str(95)` 的结果，说说区别。除了 str()，f-string 也能做这件事。',
      '参考实现：`return name + "：" + str(score)`，或 `return f"{name}：{score}"`。',
    ],
    reference: `def format_score(name, score):
    return f"{name}：{score}"`,
  },
  {
    id: 'case_indent',
    title: '③ 缩进错误',
    kpId: 'kp_indent',
    errorType: 'IndentationError',
    concept: '冒号后的代码块必须统一缩进',
    prompt: '判断及不及格的函数，解释器直接说缩进有问题。',
    starterCode: `def is_pass(score):
    if score >= 60:
    return True
    else:
        return False

print(is_pass(75))`,
    brokenLine: 3,
    tests: [
      { name: '75 分及格', call: 'is_pass(75)', expect: 'True' },
      { name: '59 分不及格', call: 'is_pass(59)', expect: 'False' },
      { name: '恰好 60 分', call: 'is_pass(60)', expect: 'True' },
    ],
    hints: [
      '第 2 行以冒号结尾，按 Python 的规矩，下一行应该长什么样？把它和第 5 行对比一下。',
      'IndentationError: expected an indented block —— if / for / def / while 行末的冒号表示「下面是一段属于我的代码块」，这段代码块必须统一向右缩进（通常 4 个空格）。',
      '第 3 行现在和第 2 行对齐，解释器会认为 if 语句没有代码块。缩进到底是在表达什么关系？试着只给第 3 行加 4 个空格，再看看解释器还报不报错。',
      '参考实现：把第 3 行 `return True` 向右缩进 4 个空格，与第 5 行对齐。',
    ],
    reference: `def is_pass(score):
    if score >= 60:
        return True
    else:
        return False`,
  },
  {
    id: 'case_name',
    title: '④ 变量名拼写不一致',
    kpId: 'kp_nameerr',
    errorType: 'NameError',
    concept: '变量必须先赋值；Python 区分大小写与拼写',
    prompt: '数偶数个数的函数，运行到一半说名字没定义。',
    starterCode: `def count_even(nums):
    count = 0
    for n in nums:
        if n % 2 == 0:
            cnt = cnt + 1
    return count

print(count_even([1, 2, 3, 4]))`,
    brokenLine: 5,
    tests: [
      { name: '两个偶数', call: 'count_even([1, 2, 3, 4])', expect: '2' },
      { name: '没有偶数', call: 'count_even([1, 3, 5])', expect: '0' },
      { name: '空列表', call: 'count_even([])', expect: '0' },
    ],
    hints: [
      '第 5 行用了一个名字，往上找一找：它在之前被赋过值吗？第 2 行定义的名字和它是同一个吗？',
      'NameError: name \'cnt\' is not defined。cnt = cnt + 1 会先读取右边的 cnt，但它从来没有出现过——用一个还没创建的变量给自己加 1，Python 不允许。',
      'Python 对变量名是「逐字符」严格匹配的。把第 2 行和第 5 行的名字并排放，数一数差了几个字母。函数最后 return 的又是哪一个？',
      '参考实现：把第 5 行改为 `count = count + 1`（或 `count += 1`）。',
    ],
    reference: `def count_even(nums):
    count = 0
    for n in nums:
        if n % 2 == 0:
            count += 1
    return count`,
  },
  {
    id: 'case_none',
    title: '⑤ 忘记 return',
    kpId: 'kp_return',
    errorType: 'TypeError (None)',
    concept: '没有 return 的函数默认返回 None',
    prompt: '明明算了两倍，结果却是 None，后面还报错。',
    starterCode: `def double(x):
    result = x * 2

print(double(5))
print(double(5) + 1)`,
    brokenLine: 2,
    tests: [
      { name: '5 的两倍', call: 'double(5)', expect: '10' },
      { name: '0 的两倍', call: 'double(0)', expect: '0' },
      { name: '负数', call: 'double(-3)', expect: '-6' },
    ],
    hints: [
      '第 2 行确实算出了结果，但函数「算完」和「交出去」是两件事。这个函数最后把结果交给调用者了吗？',
      'Python 里没有显式 return 的函数，调用后默认得到 None。print(double(5)) 输出 None，紧接着 None + 1 就触发了 TypeError。',
      '试着问自己：如果调用者写 y = double(5)，它希望 y 是什么？要让 y 拿到函数内部的 result，函数体最后一行应该写什么？',
      '参考实现：在函数体末尾加 `return result`。',
    ],
    reference: `def double(x):
    result = x * 2
    return result`,
  },
  {
    id: 'case_zero',
    title: '⑥ 空列表平均值',
    kpId: 'kp_zero',
    errorType: 'ZeroDivisionError',
    concept: '除法前需对边界情况做前置判断',
    prompt: '求平均分的函数，空列表时崩了。',
    starterCode: `def average(nums):
    return sum(nums) / len(nums)

print(average([80, 90]))
print(average([]))`,
    brokenLine: 2,
    tests: [
      { name: '两科平均', call: 'average([80, 90])', expect: '85.0' },
      { name: '单科', call: 'average([70])', expect: '70.0' },
      { name: '空列表', call: 'average([])', expect: '0' },
    ],
    hints: [
      '空列表时，len(nums) 等于几？第 2 行是在拿什么数做除数？',
      'ZeroDivisionError: division by zero。分母为 0 在数学上没有定义，任何语言都不会替你猜答案——需要你在除之前先判断边界情况。',
      '如果 nums 是空的，「平均分」应该返回什么才合理？能不能先用一个条件分支把这种情况单独处理掉，再执行除法？',
      '参考实现：`if len(nums) == 0: return 0`，然后再 `return sum(nums) / len(nums)`。',
    ],
    reference: `def average(nums):
    if len(nums) == 0:
        return 0
    return sum(nums) / len(nums)`,
  },
];

export const SAMPLE_MAP: Record<string, SampleCase> = Object.fromEntries(
  SAMPLES.map((s) => [s.id, s]),
);
