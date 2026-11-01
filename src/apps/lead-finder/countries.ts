const alpha2Codes = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(' ')

const zhNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' })
const enNames = new Intl.DisplayNames(['en'], { type: 'region' })
const overrides: Record<string, string> = {
 CN: '中国大陆', HK: '中国香港', MO: '中国澳门', TW: '中国台湾',
 KR: '韩国', KP: '朝鲜', RU: '俄罗斯', US: '美国', GB: '英国',
 VN: '越南', LA: '老挝', BO: '玻利维亚', MD: '摩尔多瓦', TZ: '坦桑尼亚',
 CI: '科特迪瓦', CV: '佛得角', CZ: '捷克', SZ: '斯威士兰', MK: '北马其顿',
 PS: '巴勒斯坦', VA: '梵蒂冈', TR: '土耳其', BN: '文莱', TL: '东帝汶',
 }
const englishOverrides: Record<string, string> = {
 US: 'United States of America', KR: 'South Korea', KP: 'North Korea',
 RU: 'Russia', VN: 'Vietnam', LA: 'Laos', BO: 'Bolivia', MD: 'Moldova',
 TZ: 'Tanzania', CI: "Côte d'Ivoire", CV: 'Cape Verde', CZ: 'Czechia',
 SZ: 'Eswatini', MK: 'North Macedonia', PS: 'Palestine', VA: 'Vatican',
 BN: 'Brunei', TL: 'Timor-Leste', HK: 'Hong Kong', MO: 'Macao', TW: 'Taiwan',
 }
function flagEmoji(code: string) {
 return String.fromCodePoint(...[...code].map(char => 127397 + char.charCodeAt(0)))
}
export type CountryOption = { code: string; name: string; flag: string; geoName: string }
export const countries: CountryOption[] = alpha2Codes.map(code => ({
 code,
 name: overrides[code] || zhNames.of(code) || code,
 flag: flagEmoji(code),
 geoName: englishOverrides[code] || enNames.of(code) || code,
}))
