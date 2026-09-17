export type ReadingPage = {title:string;text:string;note:string;label?:string};
type ReadingSource = {
 id:string; title:string; label:string;
 pages:{id:string;title:string;paragraphs:string[];sourcePages:string;takeaway:string}[];
};

// Append future PDFs as separate sources with stable IDs; keep existing sources in order.
// Reading rewards remain once per stage, independent of how many PDFs are included.
export const stage1ReadingSources:ReadingSource[]=[{
 id:'SE01-CRYSTAL-2026',
 title:'[SE] 01. Crystal Properties and Growth of Semiconductor',
 label:'자료 1 · 반도체의 결정 특성과 성장',
 pages:[
  {id:'materials',title:'1. 반도체는 조절할 수 있는 재료',sourcePages:'3–6',paragraphs:[
   '반도체는 금속과 절연체 사이의 전기전도도를 가진 재료입니다. 온도, 빛, 불순물의 양에 따라 전기가 흐르는 정도가 크게 달라져 전자소자의 재료로 활용됩니다.',
   '실리콘(Si)과 게르마늄(Ge)은 한 종류의 원소로 이루어진 원소 반도체입니다. GaAs, GaN 같은 화합물 반도체는 여러 원소로 이루어지며, 고속 소자나 빛을 내고 흡수하는 소자에 널리 쓰입니다.'
  ],takeaway:'핵심: 원자의 종류와 배열은 반도체의 전기적·광학적 성질을 결정합니다.'},
  {id:'silicon-doping',title:'2. 실리콘과 도핑',sourcePages:'7–11',paragraphs:[
   '초기 트랜지스터에는 게르마늄이 사용되었지만, 오늘날 많은 집적회로는 실리콘을 사용합니다. 실리콘은 풍부하고, 게르마늄보다 밴드갭이 커 누설 전류 억제에 유리하며, 열전도도도 높습니다.',
   '도핑(doping)은 불순물을 정밀하게 첨가하여 반도체의 성질을 조절하는 과정입니다. 아주 적은 양으로도 전도도가 크게 변하며, 주로 전자가 전류를 운반하는지 또는 정공이 운반하는지도 조절할 수 있습니다.'
  ],takeaway:'핵심: 도핑은 단순한 오염이 아니라 전기적 특성을 설계하는 과정입니다.'},
  {id:'periodicity',title:'3. 원자의 반복이 만드는 결정',sourcePages:'12–14',paragraphs:[
   '결정에서는 원자가 일정한 규칙을 따라 반복적으로 배열됩니다. 단결정은 하나의 결정 질서가 이어지는 재료이고, 다결정은 서로 다른 방향의 작은 결정들이 모인 재료입니다. 비정질은 긴 범위에서 반복되는 규칙적 배열이 없습니다.',
   '단위 셀(unit cell)은 결정의 반복 구조를 표현하는 기본 단위입니다. 작은 단위 셀을 반복해 배치하면 전체 결정의 원자 배열을 설명할 수 있습니다.'
  ],takeaway:'확인: 순도가 높은 재료라고 해서 반드시 단결정인 것은 아닙니다.'},
  {id:'cubic',title:'4. 입방 격자와 격자 상수',sourcePages:'15–16',paragraphs:[
   '단순 입방(SC)은 정육면체의 꼭짓점에 원자가 놓인 구조입니다. 체심 입방(BCC)은 여기에 정육면체 중심의 원자가 더해지고, 면심 입방(FCC)은 각 면의 중심에 원자가 놓입니다.',
   '입방 단위 셀의 한 변 길이 a를 격자 상수(lattice constant)라고 합니다. 원자 사이의 거리는 원자들을 끌어당기는 힘과 밀어내는 힘의 균형에 의해 정해집니다.'
  ],takeaway:'핵심: 같은 입방 형태라도 원자가 놓이는 위치에 따라 다른 구조가 됩니다.'},
  {id:'planes',title:'5. 결정의 면과 방향 읽기',sourcePages:'17–19',paragraphs:[
   '결정 안의 면은 밀러 지수(Miller indices) (hkl)로 나타냅니다. 입방 격자에서 면이 각 축을 만나는 위치를 격자 상수 단위로 나타낸 뒤, 그 역수의 비를 정수로 정리합니다. 축과 평행하면 해당 지수는 0입니다.',
   '예를 들어 x축과 a에서 만나고 y축·z축과 평행한 면은 (100)입니다. 대칭적으로 동등한 면들의 집합은 {100}처럼 표시합니다. 결정 방향은 벡터 성분의 비를 정수로 줄여 [uvw]로 나타내며, 면의 표기와 구분합니다.'
  ],takeaway:'핵심: (hkl)은 면, {hkl}은 동등한 면들의 집합, [uvw]는 방향입니다.'},
  {id:'diamond',title:'6. 실리콘의 다이아몬드 구조',sourcePages:'20–22',paragraphs:[
   '실리콘과 게르마늄은 다이아몬드 결정 구조를 가집니다. 이는 면심 입방 격자에 두 원자로 된 기저가 결합한 구조로, 각 원자는 가장 가까운 이웃 원자 4개에 둘러싸입니다.',
   '섬아연석(zinc blende) 구조는 다이아몬드 구조와 비슷하지만 두 종류의 원자가 서로 다른 자리를 차지합니다. 많은 III–V족 화합물 반도체가 이 구조를 가집니다. 원자 배열과 결정면은 재료의 기계적·화학적 성질에도 영향을 줍니다.'
  ],takeaway:'핵심: 다이아몬드 구조와 섬아연석 구조의 최근접 이웃 원자 수는 모두 4개입니다.'},
  {id:'purification',title:'7. 원료에서 고순도 실리콘으로',sourcePages:'23–26',paragraphs:[
   '실리콘 결정의 출발 원료는 이산화규소(SiO₂)입니다. 이를 탄소와 고온에서 반응시켜 금속급 실리콘(MGS)을 얻지만, 불순물이 많아 전자소자에 바로 사용할 수는 없습니다.',
   '추가 정제에서는 트리클로로실란(SiHCl₃)을 만들고, 불순물 화합물과의 끓는점 차이를 이용한 분별 증류로 순도를 높입니다. 이후 수소와 반응시켜 고순도 전자급 실리콘(EGS)을 얻습니다. 이 단계의 실리콘은 아직 다결정입니다.'
  ],takeaway:'핵심: 불순물을 줄이는 정제와 원자 배열을 맞추는 단결정 성장은 서로 다른 단계입니다.'},
  {id:'cz-wafer',title:'8. 단결정을 키워 웨이퍼 만들기',sourcePages:'26–29',paragraphs:[
   '초크랄스키(Czochralski, CZ)법은 녹인 고순도 실리콘에 씨앗 결정(seed crystal)을 접촉시킨 뒤 천천히 끌어올려 단결정을 성장시키는 방법입니다. 씨앗 결정은 새 결정이 따라 자랄 원자 배열의 기준이 됩니다.',
   '성장 중 결정을 회전시키면 용융액의 온도 차이와 불균일을 줄이는 데 도움이 됩니다. 이렇게 만든 잉곳을 얇게 절단하고, 가장자리 가공·연마·세정·검사 등의 공정을 거쳐 소자 제작에 쓰이는 웨이퍼를 얻습니다.'
  ],takeaway:'제작 흐름: 원료 → 정제 → 단결정 잉곳 성장 → 절단·표면 가공 → 웨이퍼.'},
  {id:'epitaxy',title:'9. 웨이퍼 위에 결정을 더 쌓기',sourcePages:'31–32',paragraphs:[
   '에피택셜 성장(epitaxial growth)은 기판 결정의 구조와 방향을 따라 정렬된 얇은 단결정층을 성장시키는 기술입니다. 단순히 물질을 덮는 것뿐 아니라, 성장층의 결정 방향이 기판과 관계를 갖는다는 점이 중요합니다.',
   '기판의 녹는점보다 낮은 온도에서도 성장시킬 수 있으며, 원자를 공급하는 방식에 따라 화학 기상 증착(CVD), 액상 에피택시(LPE), 분자선 에피택시(MBE) 등 여러 방법을 사용합니다.'
  ],takeaway:'핵심: 벌크 성장이 큰 결정을 만든다면, 에피택시는 기판 위의 얇은 결정층을 만듭니다.'},
  {id:'strain',title:'10. 격자 불일치와 변형',sourcePages:'33–34',paragraphs:[
   '기판과 성장층의 격자 상수가 다르면 성장층에 압축 또는 인장 변형(strain)이 생길 수 있습니다. 예를 들어 Si 위의 SiGe 층은 압축 변형을 받을 수 있고, 충분히 두꺼워지면 부정합 전위가 생기면서 변형이 완화될 수 있습니다.',
   '완화된 SiGe 위의 얇은 Si 층은 면내 인장 변형을 받을 수 있습니다. 강의에서는 PMOS 채널에 압축 응력을, NMOS 채널에 인장 응력을 주는 소자 사례도 소개합니다. 결정의 배열과 변형은 소자 특성을 설계하는 수단입니다.'
  ],takeaway:'되짚기: 도핑은 불순물을, 결정 성장은 원자 배열을, 에피택시는 얇은 층의 구조와 변형을 제어합니다.'}
 ]
}];

export const stage1ReadingPages:ReadingPage[]=stage1ReadingSources.flatMap(source=>source.pages.map(page=>({
 title:page.title,label:source.label,text:page.paragraphs.join('\n\n'),
 note:`${page.takeaway}\n출처: ${source.title} · PDF ${page.sourcePages}쪽`
})));
