import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleCheck,
  Clock,
  Coffee,
  FileText,
  Gamepad2,
  GitFork,
  House,
  Image as ImageIcon,
  Mail,
  Maximize2,
  MessageCircle,
  Minus,
  Pencil,
  Plus,
  Settings,
  Share,
  Sparkles,
  Trophy,
  Undo2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import artThumb from "./art-thumb.png";

type Status = "done" | "doing" | "todo";

// Canvas-relative boxes (canvas origin is draft px 269,229).
const NODES: {
  title: string;
  icon: LucideIcon;
  lines: string[];
  status: Status;
  box: [number, number, number, number];
  top: number;
  selected?: boolean;
  art?: boolean;
  tight?: boolean; // draft packs this shorter card: 22px lines
  foot?: number; // footer height, draft default 40
}[] = [
  { title: "게임 컨셉", icon: Mail, lines: ["숲속 마을의 우체국에서 편지를 배달하며", "주민들과 마음을 나누는 힐링 게임"], status: "done", box: [29, 221, 333, 207], top: 14, foot: 44 },
  { title: "핵심 플레이", icon: Gamepad2, lines: ["편지 수령 → 배달 → 주민과의 교류로", "이어지는 따뜻한 배달 루프"], status: "doing", box: [447, 36, 370, 200], top: 14, selected: true },
  { title: "세계관과 스토리", icon: BookOpen, lines: ["달빛이 비추는 숲속 마을을 배경으로,", "편지를 통해 주민들의 이야기가 이어지는 서사"], status: "done", box: [450, 257, 370, 188], top: 11, tight: true },
  { title: "아트 방향", icon: ImageIcon, lines: ["포근하고 따뜻한 동화풍", "2D 일러스트 스타일로,", "달빛이 있는 아늑한 숲속 마을"], status: "done", box: [450, 463, 368, 234], top: 10, art: true },
  { title: "성장과 보상", icon: Trophy, lines: ["편지 배달과 주민과의 교류를 통해", "신뢰를 쌓고, 새로운 지역과 꾸미기 요소를 해금"], status: "todo", box: [913, 41, 373, 203], top: 14 },
  { title: "등장인물", icon: Users, lines: ["우체국장, 단골 주민들, 그리고 편지로", "이어지는 다양한 마을 사람들"], status: "todo", box: [914, 291, 373, 202], top: 13, foot: 42 },
];

// Draft-absolute coords; the svg group is shifted by the canvas origin.
const EDGES = [
  "M631 550 C674 550 673 355 716 355",
  "M631 550 C675 550 674 576 718 576",
  "M631 550 C674 550 674 796 717 796",
  "M1086 352 C1134 352 1133 377 1181 377",
  "M1089 576 C1136 576 1135 618 1182 618",
];
const HANDLES = [
  [631, 550], [716, 355], [1086, 352], [718, 576], [1089, 576], [717, 796], [1181, 377], [1182, 618],
];

const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40";

function Dots() {
  return (
    <svg viewBox="0 0 18 18" className="size-[20px]" fill="#4F46E5">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return <circle key={i} cx={9 + 6.5 * Math.cos(a)} cy={9 + 6.5 * Math.sin(a)} r={1.6} />;
      })}
    </svg>
  );
}

const BADGE: Record<Status, { label: string; className: string; icon: React.ReactNode }> = {
  done: { label: "결정 완료", className: "bg-[#E8F8EB] text-[#15803D]", icon: <CircleCheck className="size-[21px]" fill="#16A34A" stroke="#fff" /> },
  doing: { label: "진행 중", className: "bg-[#E8E7FE] text-[#4F46E5]", icon: <Dots /> },
  todo: { label: "검토 전", className: "bg-[#ECEDF2] text-[#334155]", icon: <Clock className="size-[21px]" /> },
};

function NodeCard({ node }: { node: (typeof NODES)[number] }) {
  const [left, top, width, height] = node.box;
  const Icon = node.icon;
  const badge = BADGE[node.status];
  return (
    <div
      className={`absolute flex flex-col rounded-[12px] bg-white px-[18px] pb-[1px] shadow-[0_1px_1px_rgba(15,23,42,0.1),0_3px_9px_rgba(15,23,42,0.07)] ${
        node.selected ? "border-2 border-[#4F46E5]" : "border border-[#DCDEE4] hover:border-[#C9CCD6]"
      }`}
      style={{ left, top, width, height, paddingTop: node.top - (node.selected ? 1 : 0) }}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-[48px] items-center justify-center rounded-[8px] ${node.selected ? "bg-[#E8E7FE]" : "bg-[#ECEDF2]"}`}>
          <Icon className="size-[30px] text-[#1E293B]" strokeWidth={1.75} />
        </span>
        <h3 className="text-[22.5px] leading-7 font-bold text-[#0F172A]">{node.title}</h3>
        <Link
          href="/workflow/node"
          aria-label={`${node.title} 확장`}
          className={`ml-auto flex size-8 items-center justify-center rounded-[6px] border border-[#E4E6EC] bg-white text-[#334155] hover:bg-[#F4F5F8] ${focus}`}
        >
          <Maximize2 className="size-[17px]" />
        </Link>
      </div>

      {node.art ? (
        <div className="mt-[14px] flex gap-[13px]">
          <Image src={artThumb} alt="아트 방향 썸네일" className="h-[82px] w-[149px] rounded-[6px] object-cover" />
          <p className="-mt-1 text-[15.6px] leading-[21.5px] whitespace-nowrap text-[#1E293B]">
            {node.lines.map((l) => (
              <span key={l} className="block">{l}</span>
            ))}
          </p>
        </div>
      ) : (
        <p className={`pl-[3px] text-[17.5px] text-[#1E293B] ${node.tight ? "mt-[7px] leading-[22px]" : "mt-[9px] leading-6"}`}>
          {node.lines.map((l) => (
            <span key={l} className="block">{l}</span>
          ))}
        </p>
      )}

      <span className={`${node.tight ? "mt-[7px]" : "mt-[10px]"} inline-flex h-[29px] items-center gap-2 self-start rounded-full px-3 text-[17.5px] font-semibold ${badge.className}`}>
        {badge.icon}
        {badge.label}
      </span>

      <div className="mt-auto grid grid-cols-[1fr_1px_1.25fr_1px_42px] items-center border-t border-[#E4E6EC] text-[16.5px] text-[#334155]" style={{ height: node.foot ?? 40 }}>
        <button className={`flex h-[30px] items-center gap-2 rounded-md pl-3 text-[#1E293B] hover:bg-[#F4F5F8] ${focus}`}>
          <MessageCircle className="size-[18px]" />
          <span>대화 <span className="font-medium">4</span></span>
        </button>
        <span className="h-[18px] bg-[#DADDE4]" />
        <button className={`flex h-[30px] items-center justify-center gap-2 rounded-md hover:bg-[#F4F5F8] ${focus}`}>
          <Check className="size-[18px]" />
          결정 확정
        </button>
        <span className="h-[18px] bg-[#DADDE4]" />
        <button aria-label="되돌리기" className={`flex h-[30px] items-center justify-end rounded-md pr-1 hover:bg-[#F4F5F8] ${focus}`}>
          <Undo2 className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFD] text-[#0F172A]">
      <aside className="flex w-[269px] shrink-0 flex-col border-r border-[#E9EAF0] bg-white pb-[21px]">
        <div className="pt-5 pl-[26px]">
          <Logo size={40} />
        </div>
        <Button asChild variant="outline" className="mx-[14px] mt-[29px] h-12 gap-2 rounded-[10px] border-[#DFE1E7] bg-white text-[19px] font-medium text-[#0F172A]">
          <Link href="/">
            <Plus className="size-6" />새 프로젝트
          </Link>
        </Button>
        <p className="mt-[40px] pl-[25px] text-[19px] leading-6 font-semibold">프로젝트</p>
        <nav className="mt-[17px] flex flex-col gap-2 px-[13px] text-[19px]">
          <Link href="/workflow" aria-current="page" className={`flex h-[38px] items-center gap-3 rounded-[8px] bg-[#EAE9FD] pl-[18px] font-medium ${focus}`}>
            <Mail className="size-[23px] text-[#4F46E5]" />
            달빛 우체국
          </Link>
          <Link href="/workflow" className={`flex h-[38px] items-center gap-3 rounded-[8px] pl-[18px] hover:bg-[#F4F4F8] ${focus}`}>
            <Coffee className="size-[23px] text-[#334155]" />
            숲속 카페
          </Link>
        </nav>
        <div className="mx-[14px] mt-auto border-t border-[#DFE3EB]" />
        <button className={`mx-[13px] mt-[9px] flex h-10 items-center gap-3 rounded-[8px] pl-[21px] text-[19px] hover:bg-[#F4F4F8] ${focus}`}>
          <Settings className="size-[26px] text-[#334155]" />
          설정
        </button>
        <button className={`mt-[9px] flex items-center justify-between pr-[23px] pl-[26px] ${focus}`}>
          <Avatar className="size-10 after:hidden">
            <AvatarFallback className="bg-[#DFE1E7] text-[21px] font-bold text-[#0F172A]">J</AvatarFallback>
          </Avatar>
          <ChevronDown className="size-6 text-[#475569]" />
        </button>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[65px] shrink-0 items-center border-b border-[#E4E6EC] pr-5 pb-[2px] pl-[31px] text-[18px] font-medium">
          <House className="size-[25px]" />
          <Link href="/" className={`ml-[20px] hover:text-[#4F46E5] ${focus}`}>
            프로젝트
          </Link>
          <span className="mx-3 text-[#64748B]">/</span>
          <span>달빛 우체국</span>

          <span className="ml-auto size-[9px] rounded-full bg-[#16A34A]" />
          <span className="ml-[11px] text-[18px] font-normal text-[#475569]">저장됨</span>
          <Button variant="outline" className="ml-[23px] h-[42px] w-[102px] gap-2 rounded-[10px] border-[#DFE1E7] bg-white text-[18px] font-medium text-[#0F172A]">
            <Share className="size-[23px]" />
            공유
          </Button>
          <Button asChild className="ml-[17px] h-[42px] w-[161px] gap-2 rounded-[10px] text-[18px] font-semibold hover:bg-[#4338CA]">
            <Link href="/document">
              <Sparkles className="size-[23px]" />
              기획서 생성
            </Link>
          </Button>
        </header>

        <section className="shrink-0 border-b border-[#E2E4EC] pr-5 pl-[29px]">
          <div className="mt-[21px] flex items-center gap-[14px] pl-[2px]">
            <h1 className="text-[38px] leading-[42px] font-bold tracking-[-0.01em]">달빛 우체국</h1>
            <button aria-label="이름 편집" className={`rounded-md p-1 text-[#334155] hover:bg-[#F4F5F8] ${focus}`}>
              <Pencil className="size-[21px]" />
            </button>
          </div>
          <p className="mt-[5px] pl-[2px] text-[19.5px] leading-6 text-[#475569]">숲속 마을에 편지를 전하며 마음을 잇는 힐링 어드벤처</p>

          <div className="mt-[21px] flex items-end">
            <span className="flex h-[50px] w-[166px] items-center gap-[10px] rounded-t-[8px] border-b-2 border-[#4F46E5] bg-[#F5F5FE] pl-[25px] text-[19px] font-semibold text-[#4338CA]">
              <GitFork className="size-[25px] rotate-180 text-[#4F46E5]" />
              워크플로우
            </span>
            <Link href="/document" className={`ml-[25px] flex h-[50px] items-center gap-3 text-[19px] text-[#334155] hover:text-[#0F172A] ${focus}`}>
              <FileText className="size-6" />
              기획서
            </Link>

            <span className="mb-[11px] ml-auto flex h-8 w-[119px] items-center justify-center rounded-[8px] border border-[#DFE1E7] bg-[#FBFBFD] text-[17px] font-semibold">
              결정 완료&nbsp;<b className="font-bold">3 / 6</b>
            </span>
            <Progress value={50} aria-label="결정 진행률" className="mb-[22px] ml-[22px] h-3 w-[242px] bg-[#DCDFE8]" />
          </div>
        </section>

        <div
          className="relative flex-1"
          style={{
            backgroundColor: "#F9FAFD",
            backgroundImage: "radial-gradient(#E3E5EC 1.1px, transparent 1.2px)",
            backgroundSize: "15.2px 14.65px",
            backgroundPosition: "7.9px 7.2px",
          }}
        >
          {NODES.map((n) => (
            <NodeCard key={n.title} node={n} />
          ))}

          <svg className="pointer-events-none absolute inset-0 size-full">
            <g transform="translate(-269 -229)" stroke="#5F6573" strokeWidth={1.5} fill="none">
              {EDGES.map((d) => (
                <path key={d} d={d} />
              ))}
              {HANDLES.map(([x, y]) => (
                <circle key={`${x},${y}`} cx={x} cy={y} r={4.5} fill="#fff" />
              ))}
            </g>
          </svg>

          <div className="absolute bottom-[23px] left-[24px] flex h-[42px] w-[139px] items-center justify-between rounded-[10px] border border-[#DCDEE4] bg-white px-[10px] text-[#334155] shadow-sm">
            <button aria-label="축소" className={`rounded-md p-0.5 hover:bg-[#F4F5F8] ${focus}`}>
              <Minus className="size-[23px]" />
            </button>
            <span className="text-[16px] font-medium text-[#0F172A]">100%</span>
            <button aria-label="확대" className={`rounded-md p-0.5 hover:bg-[#F4F5F8] ${focus}`}>
              <Plus className="size-[23px]" />
            </button>
          </div>

          <svg
            viewBox="0 0 213 110"
            aria-label="미니맵"
            className="absolute right-[19px] bottom-[21px] h-[110px] w-[213px] rounded-[12px] border border-[#E2E4EA] bg-[#FBFBFD] shadow-sm"
          >
            <path d="M56 56 H66 M81 26 H71 Q66 26 66 31 V81 Q66 86 71 86 H81 M66 56 H81" stroke="#7B808C" strokeWidth={1.5} fill="none" />
            <path d="M132 26 H152 M132 55 H152" stroke="#C3C7D2" strokeWidth={1.5} />
            <rect x={16} y={47} width={40} height={19} rx={4} fill="#A3A1FD" />
            <rect x={81} y={17} width={51} height={19} rx={4} fill="#DDDBFD" stroke="#6D66F0" strokeWidth={1.5} />
            <g fill="#E4E5EB" stroke="#D3D6DE">
              <rect x={81} y={46} width={51} height={19} rx={4} />
              <rect x={81} y={75} width={51} height={19} rx={4} />
              <rect x={152} y={17} width={44} height={19} rx={4} />
              <rect x={152} y={46} width={44} height={19} rx={4} />
            </g>
          </svg>
        </div>
      </main>
    </div>
  );
}
