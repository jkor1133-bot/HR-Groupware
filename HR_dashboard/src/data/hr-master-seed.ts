import type { HrEmployee, JobTrack, LeaveReason, OrgTeam } from "@/lib/types";
import { TEAM_DIVISION } from "@/data/org";

type SeedRow = {
  name: string;
  gender: "남" | "여";
  birth: string;
  hire: string;
  leave?: string;
  leaveReason?: LeaveReason;
  track: JobTrack;
  team: OrgTeam;
  title: string;
  salary: number;
};

const ROWS: SeedRow[] = [
  { name: "김재선", gender: "남", birth: "1978-03-12", hire: "2005-04-01", track: "일반직", team: "인사총무팀", title: "부장", salary: 82000000 },
  { name: "이대현", gender: "남", birth: "1990-07-22", hire: "2016-03-02", track: "일반직", team: "인사총무팀", title: "대리", salary: 54000000 },
  { name: "김연경", gender: "여", birth: "1992-11-05", hire: "2018-07-16", track: "일반직", team: "인사총무팀", title: "대리", salary: 52000000 },
  { name: "이선미", gender: "여", birth: "1995-01-18", hire: "2020-01-06", track: "일반직", team: "인사총무팀", title: "사원", salary: 43000000 },
  { name: "이정훈", gender: "남", birth: "1998-09-30", hire: "2022-04-04", track: "일반직", team: "인사총무팀", title: "사원", salary: 38000000 },
  { name: "박재무", gender: "남", birth: "1982-05-09", hire: "2008-09-01", track: "일반직", team: "재경팀", title: "차장", salary: 79000000 },
  { name: "최회계", gender: "여", birth: "1988-12-14", hire: "2014-02-17", track: "일반직", team: "재경팀", title: "과장", salary: 61000000 },
  { name: "정세무", gender: "남", birth: "1993-04-21", hire: "2019-06-03", track: "일반직", team: "재경팀", title: "대리", salary: 50000000 },
  { name: "한신용", gender: "남", birth: "1985-08-08", hire: "2011-05-02", track: "일반직", team: "신용관리팀", title: "차장", salary: 76000000 },
  { name: "오여진", gender: "여", birth: "1994-02-27", hire: "2019-09-09", track: "일반직", team: "신용관리팀", title: "대리", salary: 49000000 },
  { name: "서곡물", gender: "남", birth: "1980-10-11", hire: "2007-01-15", track: "일반직", team: "곡물사업팀", title: "부장", salary: 80000000 },
  { name: "윤무역", gender: "여", birth: "1991-06-19", hire: "2017-04-10", track: "일반직", team: "곡물사업팀", title: "과장", salary: 58000000 },
  { name: "강물류", gender: "남", birth: "1996-03-03", hire: "2021-08-02", track: "일반직", team: "곡물사업팀", title: "사원", salary: 40000000 },
  { name: "임기술", gender: "남", birth: "1984-07-25", hire: "2010-11-01", track: "일반직", team: "기술팀", title: "차장", salary: 77000000 },
  { name: "배수리", gender: "남", birth: "1989-09-16", hire: "2015-03-23", track: "지원직", team: "기술팀", title: "대리", salary: 55000000 },
  { name: "조현장", gender: "남", birth: "1997-12-01", hire: "2023-02-13", track: "현장직", team: "기술팀", title: "사원", salary: 36000000 },
  { name: "신에스", gender: "여", birth: "1986-01-29", hire: "2012-06-18", track: "일반직", team: "SCM사업팀", title: "차장", salary: 75000000 },
  { name: "류물류", gender: "남", birth: "1993-08-07", hire: "2018-10-15", track: "일반직", team: "SCM사업팀", title: "대리", salary: 51000000 },
  { name: "문구매", gender: "남", birth: "1983-04-04", hire: "2009-08-24", track: "일반직", team: "구매팀", title: "부장", salary: 74000000 },
  { name: "송자재", gender: "여", birth: "1995-05-20", hire: "2020-11-02", track: "일반직", team: "구매팀", title: "사원", salary: 42000000 },
  { name: "황영업", gender: "남", birth: "1981-11-13", hire: "2006-07-03", track: "일반직", team: "영업팀", title: "부장", salary: 81000000 },
  { name: "고매출", gender: "여", birth: "1990-02-08", hire: "2016-09-19", track: "일반직", team: "영업팀", title: "과장", salary: 59000000 },
  { name: "남현장", gender: "남", birth: "1994-10-28", hire: "2019-01-07", track: "현장직", team: "영업팀", title: "직장", salary: 39000000 },
  { name: "유물류", gender: "남", birth: "1987-06-15", hire: "2013-04-22", track: "지원직", team: "물류지원팀", title: "대리", salary: 70000000 },
  { name: "진창고", gender: "남", birth: "1999-03-11", hire: "2023-05-08", track: "현장직", team: "물류지원팀", title: "사원", salary: 35000000 },
  { name: "차계약", gender: "여", birth: "1996-07-09", hire: "2024-01-15", track: "계약직", team: "인사총무팀", title: "사원", salary: 32000000 },
  { name: "백별정", gender: "남", birth: "1975-09-02", hire: "2015-12-01", track: "별정직", team: "물류지원팀", title: "사원", salary: 45000000 },
  { name: "기장원", gender: "남", birth: "1983-06-20", hire: "2009-03-01", track: "현장직", team: "물류지원팀", title: "기장", salary: 52000000 },
  { name: "주임지원", gender: "여", birth: "1994-08-11", hire: "2019-05-07", track: "지원직", team: "기술팀", title: "주임", salary: 44000000 },
  // 퇴사자 샘플
  { name: "구퇴사", gender: "남", birth: "1991-04-17", hire: "2017-02-01", leave: "2026-03-30", leaveReason: "이직", track: "일반직", team: "재경팀", title: "대리", salary: 48000000 },
  { name: "홍퇴사", gender: "여", birth: "1997-08-23", hire: "2021-03-15", leave: "2026-02-15", leaveReason: "계약만료", track: "계약직", team: "영업팀", title: "사원", salary: 30000000 },
  { name: "안퇴사", gender: "남", birth: "1988-12-30", hire: "2014-05-12", leave: "2026-01-31", leaveReason: "이직", track: "일반직", team: "SCM사업팀", title: "과장", salary: 56000000 },
  { name: "표퇴사", gender: "남", birth: "1999-05-11", hire: "2024-07-01", leave: "2026-04-10", leaveReason: "개인사정", track: "현장직", team: "물류지원팀", title: "사원", salary: 33000000 },
  { name: "나퇴사", gender: "여", birth: "1993-09-08", hire: "2019-04-01", leave: "2026-05-20", leaveReason: "이직", track: "일반직", team: "인사총무팀", title: "대리", salary: 47000000 },
  { name: "도퇴사", gender: "남", birth: "1985-01-22", hire: "2011-08-15", leave: "2026-06-28", leaveReason: "권고사직", track: "지원직", team: "기술팀", title: "대리", salary: 58000000 },
  { name: "미퇴사", gender: "여", birth: "2000-11-03", hire: "2025-01-06", leave: "2026-07-15", leaveReason: "계약만료", track: "계약직", team: "구매팀", title: "사원", salary: 29000000 },
  { name: "라퇴사", gender: "남", birth: "1996-06-19", hire: "2022-09-01", leave: "2026-08-01", leaveReason: "이직", track: "현장직", team: "영업팀", title: "직장", salary: 36000000 },
  { name: "소퇴사", gender: "여", birth: "1992-02-14", hire: "2018-03-12", leave: "2026-09-12", leaveReason: "개인사정", track: "일반직", team: "곡물사업팀", title: "차장", salary: 50000000 },
  { name: "부퇴사", gender: "남", birth: "1979-07-07", hire: "2006-01-03", leave: "2026-03-05", leaveReason: "이직", track: "일반직", team: "영업팀", title: "부장", salary: 78000000 },
  { name: "주퇴사", gender: "여", birth: "1995-12-01", hire: "2020-06-01", leave: "2026-04-22", leaveReason: "개인사정", track: "지원직", team: "물류지원팀", title: "주임", salary: 41000000 },
  { name: "기퇴사", gender: "남", birth: "1982-04-18", hire: "2008-09-01", leave: "2026-05-08", leaveReason: "이직", track: "현장직", team: "기술팀", title: "기장", salary: 54000000 },
  { name: "별퇴사", gender: "남", birth: "1970-10-10", hire: "2016-02-01", leave: "2026-06-01", leaveReason: "정년퇴직", track: "별정직", team: "물류지원팀", title: "사원", salary: 42000000 },
  { name: "원퇴사", gender: "여", birth: "1998-01-25", hire: "2023-03-01", leave: "2026-08-20", leaveReason: "기타", track: "일반직", team: "신용관리팀", title: "사원", salary: 37000000 },
];

function currentMonthLeaveRows(): SeedRow[] {
  const d = new Date();
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return [
    {
      name: "당월일반",
      gender: "남",
      birth: "1994-03-08",
      hire: "2020-02-01",
      leave: `${ym}-05`,
      leaveReason: "이직",
      track: "일반직",
      team: "재경팀",
      title: "대리",
      salary: 49000000,
    },
    {
      name: "당월지원",
      gender: "여",
      birth: "1996-07-19",
      hire: "2021-09-01",
      leave: `${ym}-12`,
      leaveReason: "개인사정",
      track: "지원직",
      team: "기술팀",
      title: "주임",
      salary: 40000000,
    },
    {
      name: "당월현장",
      gender: "남",
      birth: "1998-11-02",
      hire: "2023-04-01",
      leave: `${ym}-18`,
      leaveReason: "이직",
      track: "현장직",
      team: "물류지원팀",
      title: "사원",
      salary: 34000000,
    },
  ];
}

export function seedHrEmployees(): HrEmployee[] {
  return [...ROWS, ...currentMonthLeaveRows()].map((r, i) => ({
    id: `emp-${i + 1}`,
    name: r.name,
    gender: r.gender,
    birthDate: r.birth,
    hireDate: r.hire,
    leaveDate: r.leave,
    leaveReason: r.leaveReason,
    status: r.leave ? "퇴사" : "재직",
    jobTrack: r.track,
    division: TEAM_DIVISION[r.team],
    team: r.team,
    title: r.title,
    salary: r.salary,
  }));
}
