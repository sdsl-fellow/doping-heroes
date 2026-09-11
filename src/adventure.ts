export const weeklyQuests=[
 {name:'결정 숲의 루미',region:'결정 숲',week:1,title:'격자의 비밀',question:'실리콘 다이아몬드 결정에서 한 Si 원자의 최근접 이웃 원자 수는?',options:['4개','6개','8개'],answer:0,explanation:'각 Si 원자는 최근접 이웃 4개와 공유 결합하며 정사면체 구조를 이룹니다.'},
 {name:'초원의 밴디',region:'밴드 초원',week:2,title:'금지된 에너지',question:'이상적인 반도체의 밴드갭 안에는 어떤 상태가 있을까요?',options:['자유전자의 허용 상태가 연속적으로 존재','이상 결정의 허용 에너지 상태가 없음','원자핵만 이동하는 상태'],answer:1,explanation:'밴드갭은 가전자대와 전도대 사이의 금지 에너지 구간입니다. 결함이나 불순물은 갭 내 준위를 만들 수 있습니다.'},
 {name:'협곡의 캐리',region:'캐리어 협곡',week:3,title:'전자와 정공',question:'열평형에서 비축퇴 반도체의 전자 농도 n과 정공 농도 p의 관계는?',options:['n+p=0','np=nᵢ²','n=p가 항상 성립'],answer:1,explanation:'열평형의 비축퇴 반도체는 질량 작용 법칙 np=nᵢ²을 따릅니다. 도핑된 반도체에서 n과 p가 같을 필요는 없습니다.'},
 {name:'호수의 도니',region:'도핑 호수',week:4,title:'다수 캐리어의 선택',question:'Si에 인(P)을 도핑한 n형 시료의 다수 캐리어는?',options:['정공','양성자','전자'],answer:2,explanation:'인(P)은 Si에서 도너로 작용하여 전자를 제공합니다. n형의 다수 캐리어는 전자입니다.'},
 {name:'바람길의 드리',region:'이동도 계곡',week:5,title:'바람을 타는 전하',question:'같은 전기장에서 이동도 μ가 커지면 드리프트 속력은?',options:['커진다','작아진다','반드시 0이 된다'],answer:0,explanation:'낮은 전기장에서 드리프트 속력은 μE에 비례합니다. 고농도 도핑은 산란을 늘려 이동도를 낮출 수 있습니다.'},
 {name:'사막의 디퓨',region:'확산 사막',week:6,title:'농도 차이의 힘',question:'입자의 순확산은 일반적으로 어느 방향으로 일어날까요?',options:['저농도에서 고농도로','고농도에서 저농도로','농도와 무관하게 한쪽으로만'],answer:1,explanation:'확산은 농도 구배에 의해 생기며 입자의 순이동은 고농도에서 저농도 방향입니다. 전자 전류 방향은 전자 이동 방향과 반대입니다.'},
 {name:'황혼의 정션',region:'접합 숲',week:7,title:'보이지 않는 장벽',question:'열평형 pn 접합에서 외부 단자로 흐르는 순전류는?',options:['항상 매우 큰 순방향 전류','항상 역방향 전류','0'],answer:2,explanation:'열평형에서는 드리프트와 확산 전류가 서로 상쇄되어 순전류가 0입니다.'},
 {name:'설산의 모스',region:'소자 설산',week:8,title:'전계로 여는 길',question:'MOS 구조에서 절연막을 사이에 둔 게이트 전압의 주요 역할은?',options:['표면의 전하 분포를 조절한다','Si 원자핵을 제거한다','항상 게이트에 큰 직류를 흘린다'],answer:0,explanation:'게이트 전계는 반도체 표면의 축적·공핍·반전 상태를 조절합니다. 이상적인 절연막에는 직류가 흐르지 않습니다.'}
].map((q,i)=>({...q,id:i+3,dose:9*10**(13+i),coins:30,options:q.options,dopant:i%2?'B':'P'}));
export const regionPoints=weeklyQuests.map((q,i)=>({x:[207,584,945,1321][i%4],y:i<4?268:638,name:q.region,id:q.id}));
export const shopItems=[
 {id:'trailcap',name:'푸른 탐험 모자',description:'상점 전용 · 하늘빛 모자',price:60},
 {id:'snowboots',name:'설산 부츠',description:'상점 전용 · 밝은 설산 신발',price:80},
 {id:'dopant',name:'불순물 꾸러미',description:'현재 경험치 구간의 10%만큼 도핑 농도 추가',price:10},
 {id:'cap',name:'숲길 모자',description:'언제든 착용할 수 있는 모자',price:30},
 {id:'boots',name:'탐험 부츠',description:'모험용 신발',price:20},
 {id:'sword',name:'새벽의 검',description:'외형 장비 · 전투 기능 없음',price:60},
 {id:'cardigan',name:'별빛 가디건',description:'모험용 복장',price:45}
];
