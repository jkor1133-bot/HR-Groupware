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
};

/** 세부업무 상태 (병목 관리용) */
export type SubTaskStatus = "planned" | "in_progress" | "done" | "delayed";

export type WeeklySubTask = {
  id: string;
  title: string;
  /** 담당자 표시명 (팀원 id 또는 자유 텍스트, 예: 각 팀장) */
  ownerLabel: string;
  status: SubTaskStatus;
  /** 기한: YYYY-MM-DD 또는 D-3d 형식 */
  dueLabel: string;
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
  dueDate?: string;
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
  | "leave"
  | "contracts_alerts"
  | "labor_cost"
  | "work_hours"
  | "hr_kpi"
  | "hr_org"
  | "hr_demographics"
  | "hr_compensation";

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

/** 인사총무 이력 · 자격수당 */
export type QualificationAllowanceRecord = {
  id: string;
  employeeName: string;
  team: string;
  qualification: string;
  monthlyAmount: number;
  startDate: string;
  note: string;
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

/** 팀별 월간 계획·실적 (인건비=원, 근무시간=시간) */
export type TeamPeriodMetric = {
  id: string;
  yearMonth: string;
  team: OrgTeam;
  plan: number;
  actual: number;
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

export type WorkflowStatus = "planned" | "in_progress" | "done" | "delayed";

export type WorkflowStep = {
  id: string;
  title: string;
  ownerId: string;
  dueLabel: string;
  status: WorkflowStatus;
  stage: number;
};

export type WorkflowProcess = {
  id: string;
  name: string;
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
