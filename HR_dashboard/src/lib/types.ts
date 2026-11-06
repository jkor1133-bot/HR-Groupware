export type TaskStatus = "planned" | "in_progress" | "done" | "delayed";
export type TaskPriority = "high" | "medium" | "low";

export type MemberStatus = "active" | "invited" | "pending";

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  /** 회원가입·로그인 연동용. 비어 있으면 미연동(명단만) */
  email?: string;
  /**
   * 계정 연동과 맞춤:
   * - pending = 미연동(명단만)
   * - invited = 연동 준비(이메일 등록)
   * - active = 연동(가입·연결 완료)
   */
  status?: MemberStatus;
  createdAt?: string;
  /** 시스템 관리자 권한 (메뉴 지정 등) */
  isAdmin?: boolean;
  /** 사이드 메뉴 href 목록. 관리자는 전체. 홈(/)은 항상 포함 */
  allowedMenus?: string[];
  /**
   * 인사총무 이력 하위 탭 id.
   * undefined = 전부 허용(하위호환).
   * 배열이면 승진현황(promotions)은 포함될 때만 허용(다른 탭은 당분간 항상 허용).
   */
  allowedHrSubs?: string[];
};

/** 세부업무 상태 (병목 관리용) */
export type SubTaskStatus = "planned" | "in_progress" | "done" | "delayed";

export type WeeklySubTask = {
  id: string;
  title: string;
  /** 담당자 표시명 (팀원 id 또는 자유 텍스트, 예: 각 팀장) */
  ownerLabel: string;
  status: SubTaskStatus;
  /** 시작일 YYYY-MM-DD */
  startDate: string;
  /** 마감일 YYYY-MM-DD */
  endDate: string;
  /**
   * @deprecated endDate 사용. 이전 데이터 호환용(마감일과 동기화)
   */
  dueLabel?: string;
  /** 지연 시 사유 */
  delayReason: string;
};

export type WeeklyTask = {
  id: string;
  weekId: string;
  ownerId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDay: "월" | "화" | "수" | "목" | "금";
  /** 대표 기한일 (보통 endDate와 동일) */
  dueDate?: string;
  /** 업무 기간 시작 YYYY-MM-DD */
  startDate?: string;
  /** 업무 기간 종료 YYYY-MM-DD */
  endDate?: string;
  category: string;
  updatedAt: string;
  /** 업무 수행을 위한 세부업무 (클릭 시 펼침) */
  subtasks?: WeeklySubTask[];
};

export type WeeklyPlanBundle = {
  version: number;
  updatedAt: string;
  members: TeamMember[];
  tasks: WeeklyTask[];
};

export type NoticeBoard =
  | "전체"
  | "회사"
  | "그룹"
  | "인사총무"
  | "차세대ERP";

export type NoticeItem = {
  id: string;
  board: Exclude<NoticeBoard, "전체">;
  title: string;
  date: string;
  url?: string;
};

export type CalendarAttachment = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  /** localStorage용 data URL (용량 제한) */
  dataUrl: string;
};

export type CalendarVisibility = "공개" | "비공개";

/** calendar=직접 입력, weekly=주간업무, contract/permit=만료·종료 임박(표시 전용) */
export type CalendarEventSource =
  | "calendar"
  | "weekly"
  | "contract"
  | "permit";

export type CalendarEvent = {
  id: string;
  title: string;
  /** 시작일 YYYY-MM-DD */
  date: string;
  /** 종료일 YYYY-MM-DD (기간 일정) */
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  description: string;
  ownerId: string;
  createdAt: string;
  /** 캘린더/카테고리 표시명 */
  calendarName: string;
  /** 참석자 (쉼표 구분 또는 자유 텍스트) */
  attendees: string;
  visibility: CalendarVisibility;
  /** UI 색상 키 */
  color: string;
  videoLink: string;
  reminder: string;
  attachments: CalendarAttachment[];
  /** 없으면 calendar(직접 입력). weekly는 저장하지 않는 표시용 */
  source?: CalendarEventSource;
};

export type JobTrack =
  | "일반직"
  | "지원직"
  | "현장직"
  | "별정직"
  | "계약직";

export type OrgDivision =
  | "경영지원본부"
  | "국제물류사업본부"
  | "축산자원사업본부";

export type OrgTeam =
  | "인사총무팀"
  | "재경팀"
  | "신용관리팀"
  | "곡물사업팀"
  | "기술팀"
  | "SCM사업팀"
  | "구매팀"
  | "영업팀"
  | "물류지원팀";

export type EmployeeStatus = "재직" | "퇴사";
export type Gender = "남" | "여";

export type LeaveReason =
  | "이직"
  | "개인사정"
  | "계약만료"
  | "권고사직"
  | "정년퇴직"
  | "기타";

/** 인사마스터 (엑셀/ERP 연동용) */
export type HrEmployee = {
  id: string;
  name: string;
  gender: Gender;
  birthDate: string; // YYYY-MM-DD
  hireDate: string;
  leaveDate?: string;
  /** 퇴사 시 사유 */
  leaveReason?: LeaveReason;
  status: EmployeeStatus;
  jobTrack: JobTrack;
  division: OrgDivision;
  team: OrgTeam;
  title: string;
  /** 연봉(원) */
  salary: number;
};

export type HomeViewId = "ops" | "hr";

export type HomeWidgetId =
  | "weekly_plans"
  | "calendar"
  | "weekly_progress"
  | "kpi_progress"
  | "contracts_alerts"
  | "labor_cost"
  | "work_hours"
  | "hr_kpi"
  | "hr_org"
  | "hr_demographics"
  | "hr_compensation";

/** 인사총무팀 연간 KPI (전략과제) */
export type TeamKpiScope = "전사KPI" | "본부KPI" | "팀KPI" | "개인KPI";

export const TEAM_KPI_SCOPES: TeamKpiScope[] = [
  "전사KPI",
  "본부KPI",
  "팀KPI",
  "개인KPI",
];
export type TeamKpiIndicatorType = "정성" | "정량";
export type TeamKpiGrade = "S" | "A" | "B" | "C" | "D";
/** 달성률 표시 (G 100%↑ / Y 90%↑ / R 90%↓) — 등급과 별개 */
export type TeamKpiTraffic = "" | "G" | "Y" | "R";

export type TeamAnnualKpi = {
  id: string;
  /** 평가 연도 */
  year: number;
  scope: TeamKpiScope;
  /** 상위 KPI */
  parentKpi: string;
  /** KPI(과제명) */
  title: string;
  /** 산식/평가착안점 */
  evaluationNote: string;
  /** 연간 목표 */
  annualGoal: string;
  /** 비중 (%) */
  weight: number;
  indicatorType: TeamKpiIndicatorType;
  /** 등급 기준 설명 (S~D) — UI 미사용 */
  gradeCriteria?: Partial<Record<TeamKpiGrade, string>>;
  gradeBasis?: string;
  /**
   * 1~12월 수치(선택). 정성 0~100 / 정량 실적.
   * 표 양식은 주로 텍스트(당월·누계)로 관리.
   */
  monthValues: number[];
  /** @deprecated monthWorkNotes 사용 */
  monthNotes?: string[];
  /** 당월에 한 내용 (월별) */
  monthWorkNotes: string[];
  /** 누계 기준 진행 내용 (월별 스냅샷) */
  ytdProgressNotes: string[];
  /** 월별 달성 신호등 */
  monthTraffic: TeamKpiTraffic[];
};

export type HomeWidgetSize = "half" | "full";

export type HomeWidgetConfig = {
  id: HomeWidgetId;
  visible: boolean;
  size: HomeWidgetSize;
  order: number;
};

export type HomeLayoutPrefs = {
  version: number;
  defaultView: HomeViewId;
  opsWidgets: HomeWidgetConfig[];
  hrWidgets: HomeWidgetConfig[];
};

export type LeaveRecord = {
  id: string;
  name: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
};

export type ContractRecord = {
  id: string;
  employeeName: string;
  jobTrack: JobTrack | string;
  contractType: string;
  /** 최초 계약일 */
  initialDate: string;
  startDate: string;
  endDate: string;
  note: string;
};

export type PermitRecord = {
  id: string;
  name: string;
  authority: string;
  /** 최초 인허가일 */
  initialDate: string;
  startDate: string;
  endDate: string;
  note: string;
};

/** 사원명부 */
export type EmployeeRosterRecord = {
  id: string;
  /** 상위부서 */
  division: string;
  /** 부서 */
  department: string;
  /** 파트 (부서 세부) */
  part: string;
  /** 사번 */
  empNo: string;
  /** 성명 */
  name: string;
  /** 직위 */
  title: string;
  /** 직책 */
  jobRole: string;
  /** 직군 */
  jobTrack: string;
  /** 성별 */
  gender: string;
  /** 직위년차 */
  titleYears: number;
  /** 연봉(전년, 원). 0이면 미입력 */
  salary: number;
  /** 계약연봉(당년, 원). 0이면 미입력 */
  contractSalary: number;
  /** 그룹입사일자 YYYY-MM-DD */
  groupHireDate: string;
  /** 입사일자 YYYY-MM-DD */
  hireDate: string;
};

/** 인사 · 입퇴사자 현황 */
export type StaffMovementKind = "hire" | "leave";

export type StaffMovementRecord = {
  id: string;
  kind: StaffMovementKind;
  name: string;
  empNo: string;
  division: string;
  department: string;
  jobTrack: string;
  title: string;
  gender: string;
  /** 입사일 또는 퇴사일 */
  eventDate: string;
  /** 퇴사 시 입사일(근속·분석용) */
  hireDate?: string;
  leaveReason?: LeaveReason | string;
  note: string;
  /** 사원명부 id (연동 시) */
  rosterId?: string;
};

/** 인사총무 이력 · 승진 발령 */
export type PromotionRecord = {
  id: string;
  employeeName: string;
  team: string;
  fromTitle: string;
  toTitle: string;
  effectiveDate: string;
  note: string;
};

/** 인사총무 이력 · 승진포인트 (연도별 등급: "2018" → "A" 등) */
export type PromotionPointRecord = {
  id: string;
  division: string;
  team: string;
  name: string;
  /** 직책 (팀장·팀원 등) */
  jobRole: string;
  /** 직위 (사원·대리·과장·차장·부장) */
  title: string;
  /** 직위년차 */
  titleYears: number;
  hireDate: string;
  /**
   * 입사 인정 년차 (경력직).
   * 1=신입, 2=2년차 입사 → 기존 1년 B(60점) 인정, 5=5년차 입사 → 4×60=240점.
   */
  hireAsYear: number;
  grades: Record<string, string>;
  note: string;
};

/** 인사총무 이력 · 포상 */
export type AwardRecord = {
  id: string;
  employeeName: string;
  team: string;
  awardName: string;
  awardDate: string;
  note: string;
};

/** 인사총무 이력 · 자격수당 (레거시·로컬 데이터 호환용) */
export type QualificationAllowanceRecord = {
  id: string;
  employeeName: string;
  team: string;
  qualification: string;
  monthlyAmount: number;
  startDate: string;
  note: string;
};

/** 인사 · Pay-Band 직군 */
export type PayBandTrack = "일반직" | "지원직";

/** 직위별 Pay-Band 수치 (빈 값은 null) */
export type PayBandTitleMetrics = {
  title: string;
  /** 표준체류년수 */
  standardYears: number | null;
  /** 한계체류년수 */
  limitYears: number | null;
  /** Min 직급초임(원) */
  minSalary: number | null;
  /**
   * Max (차트용, 원).
   * 제도상 직급 상한은 폐지됐지만, 연봉 위치 시각화를 위해 임의 입력.
   */
  maxSalary: number | null;
  /** 승진가급(원) */
  promotionBump: number | null;
};

/** 인사 · Pay-Band 현황 (직군별 매트릭스) */
export type PayBandMatrix = {
  company: string;
  general: PayBandTitleMetrics[];
  support: PayBandTitleMetrics[];
};

/** @deprecated 이전 개인별 Pay-Band 목록 — 로컬 호환용 */
export type PayBandRecord = {
  id: string;
  employeeName: string;
  team: string;
  payBand: string;
  effectiveDate: string;
  note: string;
};

/** 총무 · 경조사 기준표 (그룹사 임원 / 직원) */
export type CongratulatoryStandardRecord = {
  id: string;
  /** 경조사 구분 (결혼, 출산, 사망 등) */
  eventType: string;
  /** 대상·관계 (본인, 배우자, 부모 등) */
  relation: string;
  /** 지급액(원) */
  amount: number;
  /** 적용일 */
  effectiveDate: string;
  note: string;
};

/** 그룹사 임원 경조사 기준표 한 행 (단위: 만원, 빈칸·300(500) 문자열) */
export type CongratPolicyRow = {
  id: string;
  group: string;
  groupSpan: number;
  target: string;
  congChair: string;
  congCeo: string;
  condChair: string;
  condCeo: string;
};

/** 기준표 스냅샷 1건 (현행 또는 이력) */
export type CongratPolicySnapshot = {
  id: string;
  /** 시행일 YYYY-MM-DD */
  effectiveDate: string;
  /** 변경·개정 사유 */
  note: string;
  description: string;
  companyFootnote: string;
  companyRows: CongratPolicyRow[];
  affiliateRows: CongratPolicyRow[];
  /** 이력으로 보관된 시각 ISO */
  archivedAt?: string;
};

/** localStorage: 현행 + 변경 이력 */
export type CongratPolicyStore = {
  current: CongratPolicySnapshot;
  history: CongratPolicySnapshot[];
};

/** 직원 경조사 기준표 한 행 */
export type StaffCongratPolicyRow = {
  id: string;
  /** 결혼·사망·출산 등 */
  category: string;
  categorySpan: number;
  target: string;
  /** 경조금 (원, 표시용 문자열) */
  allowance: string;
  /** 휴가일 */
  leaveDays: string;
  /** 경조화환 O 또는 빈칸 */
  wreath: string;
  /** 상조용품 O 또는 빈칸 */
  funeralGoods: string;
  note: string;
};

export type StaffCongratPolicySnapshot = {
  id: string;
  effectiveDate: string;
  note: string;
  description: string;
  rows: StaffCongratPolicyRow[];
  archivedAt?: string;
};

export type StaffCongratPolicyStore = {
  current: StaffCongratPolicySnapshot;
  history: StaffCongratPolicySnapshot[];
};

/** 총무 · 차량 지급 기준 메모 히스토리 */
export type PolicyMemoRecord = {
  id: string;
  /** 작성·개정일 */
  memoDate: string;
  /** 제목·요약 */
  title: string;
  /** 본문 */
  body: string;
  note: string;
};

/** 그룹사 임원 차량 지급 기준 한 행 */
export type ExecVehiclePolicyRow = {
  id: string;
  /** 직급 구분 */
  rank: string;
  /** 차종 */
  model: string;
  /** 배기량 (cc, 표시 문자열) */
  displacement: string;
};

export type ExecVehiclePolicySnapshot = {
  id: string;
  /** 예: 현재 (2020.04 이후) */
  periodLabel: string;
  effectiveDate: string;
  note: string;
  rows: ExecVehiclePolicyRow[];
  footnotes: string[];
  archivedAt?: string;
};

export type ExecVehiclePolicyStore = {
  current: ExecVehiclePolicySnapshot;
  history: ExecVehiclePolicySnapshot[];
};

/** 당사 업무용 차량 지급 기준 행 */
export type CompanyVehiclePolicyRow = {
  id: string;
  /** 구분 (직책·직급) */
  rank: string;
  /** 차종 */
  model: string;
};

export type CompanyVehiclePolicySnapshot = {
  id: string;
  /** 예: 현재 */
  periodLabel: string;
  effectiveDate: string;
  note: string;
  rows: CompanyVehiclePolicyRow[];
  footnotes: string[];
  archivedAt?: string;
};

export type CompanyVehiclePolicyStore = {
  current: CompanyVehiclePolicySnapshot;
  history: CompanyVehiclePolicySnapshot[];
};

/** 총무 · 골프 회원권 */
export type GolfMembershipRecord = {
  id: string;
  clubName: string;
  memberName: string;
  membershipType: string;
  startDate: string;
  endDate: string;
  note: string;
};

/** 총무 · 업무용 차량 */
export type CompanyVehicleRecord = {
  id: string;
  plateNo: string;
  model: string;
  assignee: string;
  team: string;
  acquiredDate: string;
  note: string;
};

/** 총무 · 해외연수 */
export type OverseasTrainingRecord = {
  id: string;
  employeeName: string;
  team: string;
  country: string;
  program: string;
  startDate: string;
  endDate: string;
  note: string;
};

/** IT · PC 지급 */
export type PcAssignmentRecord = {
  id: string;
  employeeName: string;
  team: string;
  assetTag: string;
  model: string;
  assignedDate: string;
  note: string;
};

/** IT · IP 부여 */
export type IpAssignmentRecord = {
  id: string;
  /** 사용자 (성명·직책명 등) */
  userName: string;
  /** IPv4 예: 210.101.130.2 */
  ipAddress: string;
  note: string;
};

export type LaborCostRow = {
  id: string;
  yearMonth: string; // YYYY-MM
  jobTrack: JobTrack;
  headcount: number;
  amount: number; // 원
};

export type WorkHoursRow = {
  id: string;
  yearMonth: string;
  jobTrack: "현장직" | "별정직";
  hours: number;
};

/** 근무시간 세부 항목 */
export type WorkHourDetailKey =
  | "overtime"
  | "night"
  | "holiday"
  | "holidayOt";

export type WorkHourDetailSlice = {
  plan: number;
  actual: number;
};

export type WorkHourDetails = Record<WorkHourDetailKey, WorkHourDetailSlice>;

/** 팀별 월간 계획·실적 (인건비=원, 근무시간=시간) */
export type TeamPeriodMetric = {
  id: string;
  yearMonth: string;
  team: OrgTeam;
  /** 파트·사업소 (없으면 팀 단위) */
  part?: string;
  plan: number;
  actual: number;
  /** 근무시간 세부(연장·야간·휴일·휴일연장). 인건비는 미사용 */
  hourDetails?: WorkHourDetails;
};

export type RaciActivity = {
  id: string;
  jobCategory: string;
  task: string;
  activity: string;
  weights: Record<string, number>;
};

export type RaciBundle = {
  version: number;
  updatedAt: string;
  members: TeamMember[];
  activities: RaciActivity[];
};

/** @deprecated 진행 상태 추적 제거 — 하위호환용 */
export type WorkflowStatus = "planned" | "in_progress" | "done" | "delayed";

/** 업무기술서 대분류 탭 */
export type WorkflowDomain = "hr" | "ga" | "planning";

/** 업무 기준 첨부파일 (로컬 저장용 data URL) */
export type WorkflowAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
};

/** 기준 변경 이력 (A → B, 일자, 사유) */
export type WorkflowStandardChange = {
  id: string;
  changedAt: string;
  fromLabel: string;
  toLabel: string;
  reason: string;
  attachmentId?: string;
  createdAt: string;
};

export type WorkflowStep = {
  id: string;
  title: string;
  ownerId: string;
  /** 표준 일정 표기 (예: D-14, 매월 15일) */
  dueLabel: string;
  /** @deprecated 표시하지 않음 */
  status?: WorkflowStatus;
  stage: number;
  /** 이 단계의 현재 기준 명칭 */
  standardLabel?: string;
  /** 이 단계의 기준 문서 */
  attachments?: WorkflowAttachment[];
  /** 이 단계의 기준 변경 이력 */
  changeHistory?: WorkflowStandardChange[];
};

export type WorkflowProcess = {
  id: string;
  name: string;
  /** 인사 / 총무 / 기획 */
  domain: WorkflowDomain;
  category: string;
  description: string;
  steps: WorkflowStep[];
  updatedAt: string;
};

export type WorkflowBundle = {
  version: number;
  updatedAt: string;
  processes: WorkflowProcess[];
};

export type ViewMode = "pc" | "mobile";
export type ThemeMode = "light" | "dark";
export type FontScale = 90 | 100 | 110 | 120;
