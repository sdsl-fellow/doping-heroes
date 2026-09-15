import {shopCatalog} from './catalog.mjs';
import {stageForQuest} from './maps.mjs';
import {stageDose} from './progression.mjs';
const topicUpdates:Record<number,{name:string;title:string;question:string;options:string[];answer:number;explanation:string}>={
 6:{name:'도시의 게이티',title:'채널을 감싸는 게이트',question:'GAA 트랜지스터에서 게이트가 채널을 둘러싸도록 설계하는 주된 목적은?',options:['채널에 대한 전기적 제어 향상','게이트 절연막 제거','모든 누설 전류를 완전히 없애기'],answer:0,explanation:'게이트가 채널을 여러 방향에서 제어하면 단채널 효과를 억제하는 데 유리합니다. 실제 소자에서는 누설과 공정 한계도 함께 고려합니다.'},
 9:{name:'기억의 메모',title:'전원 너머의 기억',question:'전원이 꺼져도 저장된 정보를 유지하도록 설계된 메모리는?',options:['DRAM','SRAM','Flash'],answer:2,explanation:'Flash는 비휘발성 메모리입니다. SRAM과 DRAM은 정보를 유지하려면 전원이 필요합니다. 비휘발성 메모리도 보존 시간과 내구성에 한계가 있습니다.'},
 11:{name:'빛의 포토',title:'빛을 전류로',question:'포토다이오드에서 흡수된 빛이 전류 신호를 만드는 데 이용되는 과정은?',options:['광흡수에 따른 전자·정공 생성','원자핵의 분열','기판의 기계적 회전'],answer:0,explanation:'반도체가 적절한 에너지의 광자를 흡수하면 전자·정공 쌍이 생성될 수 있습니다. 생성된 캐리어를 수집하여 광신호를 전기신호로 바꿉니다.'},
 12:{name:'공장의 패키',title:'칩을 연결하는 기술',question:'반도체 패키징의 주요 역할로 가장 적절한 것은?',options:['칩 사이의 모든 연결 제거','칩 보호·전기적 연결·열 방출 지원','반도체의 원자번호 변경'],answer:1,explanation:'패키징은 칩을 보호하고 외부와 연결하며 열을 방출하도록 돕습니다. 첨단 패키징은 여러 칩의 고밀도 연결과 적층도 지원합니다.'}
};
export const weeklyQuests=[
 {name:'동굴의 루미',region:'결정 숲',week:1,title:'격자의 비밀',question:'실리콘 다이아몬드 결정에서 한 Si 원자의 최근접 이웃 원자 수는?',options:['4개','6개','8개'],answer:0,explanation:'각 Si 원자는 최근접 이웃 4개와 공유 결합하며 정사면체 구조를 이룹니다.'},
 {name:'계곡의 밴디',region:'밴드 초원',week:2,title:'금지된 에너지',question:'이상적인 반도체의 밴드갭 안에는 어떤 상태가 있을까요?',options:['자유전자의 허용 상태가 연속적으로 존재','이상 결정의 허용 에너지 상태가 없음','원자핵만 이동하는 상태'],answer:1,explanation:'밴드갭은 가전자대와 전도대 사이의 금지 에너지 구간입니다. 결함이나 불순물은 갭 내 준위를 만들 수 있습니다.'},
 {name:'습지의 캐리',region:'캐리어 협곡',week:3,title:'전자와 정공',question:'열평형에서 비축퇴 반도체의 전자 농도 n과 정공 농도 p의 관계는?',options:['n+p=0','np=nᵢ²','n=p가 항상 성립'],answer:1,explanation:'열평형의 비축퇴 반도체는 질량 작용 법칙 np=nᵢ²을 따릅니다. 도핑된 반도체에서 n과 p가 같을 필요는 없습니다.'},
 {name:'호수의 도니',region:'도핑 호수',week:4,title:'다수 캐리어의 선택',question:'Si에 인(P)을 도핑한 n형 시료의 다수 캐리어는?',options:['정공','양성자','전자'],answer:2,explanation:'인(P)은 Si에서 도너로 작용하여 전자를 제공합니다. n형의 다수 캐리어는 전자입니다.'},
 {name:'바람길의 드리',region:'이동도 계곡',week:5,title:'바람을 타는 전하',question:'같은 전기장에서 이동도 μ가 커지면 드리프트 속력은?',options:['커진다','작아진다','반드시 0이 된다'],answer:0,explanation:'낮은 전기장에서 드리프트 속력은 μE에 비례합니다. 고농도 도핑은 산란을 늘려 이동도를 낮출 수 있습니다.'},
 {name:'사막의 디퓨',region:'확산 사막',week:6,title:'농도 차이의 힘',question:'입자의 순확산은 일반적으로 어느 방향으로 일어날까요?',options:['저농도에서 고농도로','고농도에서 저농도로','농도와 무관하게 한쪽으로만'],answer:1,explanation:'확산은 농도 구배에 의해 생기며 입자의 순이동은 고농도에서 저농도 방향입니다. 전자 전류 방향은 전자 이동 방향과 반대입니다.'},
 {name:'황혼의 정션',region:'접합 숲',week:7,title:'보이지 않는 장벽',question:'열평형 pn 접합에서 외부 단자로 흐르는 순전류는?',options:['항상 매우 큰 순방향 전류','항상 역방향 전류','0'],answer:2,explanation:'열평형에서는 드리프트와 확산 전류가 서로 상쇄되어 순전류가 0입니다.'},
 {name:'정글의 모스',region:'소자 설산',week:8,title:'전계로 여는 길',question:'MOS 구조에서 절연막을 사이에 둔 게이트 전압의 주요 역할은?',options:['표면의 전하 분포를 조절한다','Si 원자핵을 제거한다','항상 게이트에 큰 직류를 흘린다'],answer:0,explanation:'게이트 전계는 반도체 표면의 축적·공핍·반전 상태를 조절합니다. 이상적인 절연막에는 직류가 흐르지 않습니다.'},
 {name:'격자의 셀리',region:'격자 유적',week:9,title:'반복되는 작은 세계',question:'결정 전체를 평행 이동으로 재현할 수 있는 기본 반복 단위를 무엇이라 하나요?',options:['단위 격자','공핍층','밴드갭'],answer:0,explanation:'단위 격자는 결정의 주기적인 구조를 나타내는 반복 단위입니다.'},
 {name:'공방의 다이',region:'다이오드 용암 공방',week:10,title:'전류가 흐르는 방향',question:'일반적인 pn 다이오드의 순방향 바이어스는?',options:['p쪽 음극, n쪽 양극','p쪽 양극, n쪽 음극','양쪽 모두 반드시 접지'],answer:1,explanation:'p쪽에 양의 전압, n쪽에 음의 전압을 가하면 장벽이 낮아져 순방향 전류가 흐르기 쉬워집니다.'},
 {name:'바다의 바이',region:'BJT 오션',week:11,title:'세 개의 단자',question:'BJT의 세 단자 이름은?',options:['게이트·소스·드레인','애노드·캐소드·기판','이미터·베이스·컬렉터'],answer:2,explanation:'BJT는 이미터, 베이스, 컬렉터로 이루어집니다. 전자와 정공 두 종류 캐리어가 동작에 관여합니다.'},
 {name:'요새의 파워',region:'Power 반도체 동굴',week:12,title:'전력을 다루는 결정',question:'전력 반도체 설계에서 함께 고려하는 대표 성능은?',options:['차단 전압과 도통·스위칭 손실','화면 해상도와 음량','원자의 색과 냄새'],answer:0,explanation:'전력 소자는 높은 차단 전압, 낮은 도통 손실과 스위칭 손실 등 여러 특성의 균형을 고려합니다.'}

].map((q,i)=>({...q,...topicUpdates[i+3],region:stageForQuest(i+3)!.name,week:stageForQuest(i+3)!.index+1,id:i+3,dose:stageDose(stageForQuest(i+3)!.index),coins:30,options:topicUpdates[i+3]?.options??q.options,dopant:i%2?'B':'P'}));

export const shopItems=shopCatalog;
