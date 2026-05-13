import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Empty,
  Modal,
  Pagination,
  Radio,
  Slider,
  Space,
  Statistic,
  Table,
  Tooltip,
  Typography,
} from "antd";
import {
  CloseOutlined,
  CopyOutlined,
  DownloadOutlined,
  FileMarkdownOutlined,
  InboxOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrderedCards, getTrainingQueue } from "../lib/srs";
import { downloadMarkdownTemplate } from "../lib/template";
import { useCardsStore } from "../store/useCardsStore";
import type { TrainingMode, VocabularyCard } from "../types/cards";

const { Text, Title } = Typography;
const TRAINING_TABLE_PAGE_SIZE = 30;

const formatSyncedAt = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("ru", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Пока нет";

export function HomePage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [notice, setNotice] = useState<string | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyCount, setCopyCount] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const trainingTableScrollRef = useRef<HTMLDivElement | null>(null);
  const {
    cards,
    clearFile,
    dropFile,
    error,
    fileName,
    hydrate,
    isHydrated,
    isLoading,
    lastSyncedAt,
    setTrainingMode,
    syncFromFile,
    trainingMode,
  } = useCardsStore();
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  useEffect(() => {
    if (!isHydrated) void hydrate();
  }, [hydrate, isHydrated]);

  const orderedCards = useMemo(() => getOrderedCards(cards), [cards]);
  const trainingQueue = useMemo(() => getTrainingQueue(cards), [cards]);
  const copyLimit = Math.min(copyCount, trainingQueue.length);
  const hasOpenFile = Boolean(fileName);
  const maxTrainingTablePage = Math.max(
    1,
    Math.ceil(orderedCards.length / TRAINING_TABLE_PAGE_SIZE),
  );
  const visibleTrainingTablePage = Math.min(currentPage, maxTrainingTablePage);
  const paginatedOrderedCards = useMemo(() => {
    const startIndex =
      (visibleTrainingTablePage - 1) * TRAINING_TABLE_PAGE_SIZE;
    return orderedCards.slice(
      startIndex,
      startIndex + TRAINING_TABLE_PAGE_SIZE,
    );
  }, [orderedCards, visibleTrainingTablePage]);

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    setIsDraggingFile(false);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    setNotice(null);
    setCurrentPage(1);
    await dropFile(event.dataTransfer);
  };

  const closeFile = async () => {
    setNotice(null);
    setIsCopyModalOpen(false);
    setCurrentPage(1);
    await clearFile();
  };

  const changeTrainingTablePage = (page: number) => {
    setCurrentPage(page);
    trainingTableScrollRef.current?.scrollTo({ top: 0, left: 0 });
  };

  const startTraining = async () => {
    setNotice(null);
    await syncFromFile();

    const queue = getTrainingQueue(useCardsStore.getState().cards);
    if (queue.length === 0) {
      setNotice("На сегодня нет карточек для тренировки.");
      return;
    }

    navigate("/training");
  };

  const copyTrainingWords = async () => {
    const words = trainingQueue
      .slice(0, copyLimit)
      .map((card) => `- ${card.word}`);

    if (words.length === 0) {
      message.warning("В текущей тренировке нет слов для копирования.");
      return;
    }

    try {
      await navigator.clipboard.writeText(words.join("\n"));
      message.success(`Скопировано слов: ${words.length}`);
      setIsCopyModalOpen(false);
    } catch {
      message.error("Не удалось скопировать слова в буфер обмена.");
    }
  };

  const columns = [
    {
      title: "Слово",
      dataIndex: "word",
      key: "word",
      render: (value: string) => <Text strong>{value}</Text>,
      width: "34%",
    },
    {
      title: "Перевод",
      dataIndex: "translation",
      key: "translation",
      render: (value: string) => value || <Text type="secondary">Пусто</Text>,
      width: "34%",
    },
    {
      title: "Повторить",
      key: "due",
      render: (_: unknown, card: VocabularyCard) =>
        card.progress.due || <Text type="secondary">Новая</Text>,
      width: "12%",
    },
    {
      title: "Интервал",
      key: "interval",
      render: (_: unknown, card: VocabularyCard) =>
        card.progress.interval ? `${card.progress.interval} дн.` : "0 дн.",
      width: "10%",
    },
    {
      title: "Повторы",
      key: "repetitions",
      render: (_: unknown, card: VocabularyCard) =>
        card.progress.repetitions ?? 0,
      width: "10%",
    },
  ];

  return (
    <main className="page home-page">
      <section className="page-header">
        <div>
          <Text className="eyebrow">Markdown vocabulary</Text>
          <Title level={1}>Тренировка английских слов</Title>
        </div>
        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadMarkdownTemplate}
          >
            Скачать шаблон
          </Button>
          <Button
            danger
            disabled={!hasOpenFile || isLoading}
            icon={<CloseOutlined />}
            onClick={closeFile}
          >
            Закрыть файл
          </Button>
          <Button
            disabled={!hasOpenFile}
            icon={<ReloadOutlined />}
            loading={isLoading}
            onClick={syncFromFile}
          >
            Синхронизировать
          </Button>
        </Space>
      </section>

      <section className="home-workspace">
        <Card
          className="training-table-card"
          extra={
            <Space wrap>
              <Tooltip title="Скопировать первые слова тренировки">
                <Button
                  aria-label="Скопировать первые слова тренировки"
                  disabled={trainingQueue.length === 0}
                  icon={<CopyOutlined />}
                  onClick={() => setIsCopyModalOpen(true)}
                />
              </Tooltip>
              <Button
                disabled={!fileName || trainingQueue.length === 0}
                icon={<PlayCircleOutlined />}
                loading={isLoading}
                onClick={startTraining}
                type="primary"
              >
                Начать тренировку
              </Button>
            </Space>
          }
          title="Порядок тренировки"
        >
          {hasOpenFile ? (
            <>
              <div className="training-table-scroll" ref={trainingTableScrollRef}>
                <Table
                  columns={columns}
                  dataSource={paginatedOrderedCards}
                  locale={{
                    emptyText: <Empty description="В файле нет карточек" />,
                  }}
                  pagination={false}
                  rowKey="id"
                  size="small"
                  tableLayout="fixed"
                />
              </div>
              {orderedCards.length > 0 ? (
                <Pagination
                  className="training-table-pagination"
                  current={visibleTrainingTablePage}
                  onChange={changeTrainingTablePage}
                  pageSize={TRAINING_TABLE_PAGE_SIZE}
                  showSizeChanger={false}
                  total={orderedCards.length}
                />
              ) : null}
            </>
          ) : (
            <section
              className={`file-drop-zone training-table-drop-zone ${isDraggingFile ? "is-active" : ""}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <InboxOutlined className="file-drop-zone-icon" />
              <div>
                <Text strong>Перетащите сюда markdown-файл</Text>
                <br />
                <Text type="secondary">
                  Файл будет выбран, сохранен в IndexedDB и сразу
                  синхронизирован
                </Text>
              </div>
            </section>
          )}
        </Card>

        <section className="home-side-panel">
          {error ? <Alert message={error} showIcon type="warning" /> : null}
          {notice ? <Alert message={notice} showIcon type="info" /> : null}

          <Card className="training-settings-card" title="Настройка тренировки">
            <Radio.Group
              className="training-mode-radio-group"
              onChange={(event) =>
                setTrainingMode(event.target.value as TrainingMode)
              }
              value={trainingMode}
            >
              <Space direction="vertical" size={10}>
                <Radio value="english">Все английские слова</Radio>
                <Radio value="random">Рандомные слова</Radio>
                <Radio value="russian">Все на русском</Radio>
              </Space>
            </Radio.Group>
          </Card>

          <section className="dashboard-grid">
            <Card>
              <Statistic
                prefix={<FileMarkdownOutlined />}
                title="Выбранный файл"
                value={fileName ?? "Не выбран"}
              />
              <Text type="secondary">
                Последняя синхронизация: {formatSyncedAt(lastSyncedAt)}
              </Text>
            </Card>
            <Card>
              <Statistic title="Карточек в файле" value={cards.length} />
              <Text type="secondary">
                Строки без английского слова игнорируются
              </Text>
            </Card>
            <Card>
              <Statistic
                title="В текущей тренировке"
                value={trainingQueue.length}
              />
              <Text type="secondary">Новые и просроченные карточки</Text>
            </Card>
          </section>
        </section>
      </section>

      <Modal
        footer={null}
        onCancel={() => setIsCopyModalOpen(false)}
        open={isCopyModalOpen}
        title="Скопировать слова"
      >
        <div className="copy-words-modal">
          <Text>Количество первых слов: {copyLimit}</Text>
          <Slider
            marks={{
              1: "1",
              5: "5",
              10: "10",
              15: "15",
              20: "20",
            }}
            max={20}
            min={1}
            onChange={setCopyCount}
            step={1}
            value={copyCount}
          />
          <Button
            block
            icon={<CopyOutlined />}
            onClick={copyTrainingWords}
            type="primary"
          >
            Скопировать
          </Button>
        </div>
      </Modal>
    </main>
  );
}
