import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  notification,
  Popconfirm,
  Row,
  Select,
  Space,
  Layout,
  Typography,
  Result,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  PrinterFilled,
} from "@ant-design/icons";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useImmerReducer } from "use-immer";
import axios from "axios";

import api from "../../services/api";
import useHandbook from "../../hooks/useHandbook";
import useColleagues from "../../hooks/useColleagues";
import useAuth from "../../hooks/useAuth";

import dayjs from "dayjs";
import TreeSelectCollegues from "@modules/TreeSelect/TreeSelectCollegues";
import TreeSelectHandbook from "@modules/TreeSelect/TreeSelectHandook";
import Loader from "@modules/Loader";
import EdoAgreementModal from "@modules/Edo/EdoAgreementModal";
import EdoDismissalModal from "@modules/Edo/EdoDismissalModal";
import EdoSearch from "@modules/Edo/EdoSearch";
import { toLowerCase } from "./toLowercase";
import GenerateLS from "./GenerateLS";
import CancelLS from "./CancelLS";
import EditLS from "./EditLS";
import DateMask from "@modules/Edo/DateMask";
import type { RangePickerProps } from "antd/es/date-picker";

import { useDispatch } from "react-redux";
import { addClassID } from "../../store/Edo/actions";
import CustomLoader from "@components/UI/CustomLoader/CustomLoader";

const { Content } = Layout;
const { Title } = Typography;

interface Props {
  title: string;
}
interface Document {
  class: {
    full_name: string;
  };
  class_id: number;
  client_id: number;
  date_reg: Date;
  department_id: number;
  document_id: string;
  employee_id: number;
  id: number;
  status_id: number;
  // show
  doc_row: any[];
  attributes: any[];
  doc_file: any[];
  remark_enabled: boolean;
  remark2: string;
  remark: string;
  remark_template: boolean;
  document_row_id: number;
  status: {
    constant: string;
  };
  stage: {
    slug: string;
  };
  stage_id: number;
  kias_err: boolean;
  active: boolean;
}

interface Settings {
  id: number;
  show_client: boolean;
  show_stage: boolean;
  form_columns: any[];
  show_period: boolean;
  disable_period: boolean;
  show_date_denounce: boolean;
}

type Action = {
  type:
    | "settings"
    | "loadingSettings"
    | "nextStep"
    | "backStep"
    | "document"
    | "deleteDocument"
    | "showModal"
    | "hideModal"
    | "showDismissalModal"
    | "hideDismissalModal"
    | "downloadForm"
    | "reSendKias";
  payload?: any;
};

export interface ContextType {
  docEdo: {
    data: Document;
  };
  settings: any;
  colleaguesList: any;
  handbookStatusList: any;
  handbookList: any;
  departmentList: any[];
  remark_enabled: boolean;
}

interface State {
  settings: {
    id: number | null;
    data: Settings | null;
    isLoading: boolean;
  };

  docEdo: {
    data: Document | null;
    isLoading: boolean;
  };

  step: number;
  isVisibleModal: boolean;
  downloadForm: boolean;
  isVisibleDismissalModal: boolean;
  sendKiasStatus: boolean;
}

const initialState: State = {
  settings: {
    data: null,
    isLoading: false,
    id: null,
  },
  docEdo: {
    data: null,
    isLoading: false,
  },
  step: 1,
  isVisibleModal: false,
  downloadForm: false,
  isVisibleDismissalModal: false,
  sendKiasStatus: false,
};

const reducer = (draft = initialState, action: Action) => {
  switch (action.type) {
    case "settings": {
      draft.settings.data = action.payload;
      break;
    }
    case "loadingSettings": {
      draft.settings.isLoading = action.payload;
      break;
    }
    case "nextStep": {
      draft.step = action.payload;
      break;
    }
    case "document": {
      draft.docEdo.data = action.payload;
      draft.sendKiasStatus = action.payload.kias_err;
      break;
    }
    case "backStep": {
      draft.step = draft.step - 1;
      draft.docEdo.data = null;
      draft.settings.data = null;
      break;
    }
    case "reSendKias": {
      draft.sendKiasStatus = action.payload;
      break;
    }
    // case 'deleteDocument': {
    //   break;
    // }
    case "showDismissalModal": {
      draft.isVisibleDismissalModal = true;
      break;
    }
    case "showModal": {
      draft.isVisibleModal = true;
      break;
    }
    case "hideDismissalModal": {
      draft.isVisibleDismissalModal = false;
      break;
    }
    case "hideModal": {
      draft.isVisibleModal = false;
      break;
    }
    case "downloadForm": {
      draft.downloadForm = action.payload;
      break;
    }
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
};

function EdoPage({ title = "Mycent.kz" }: Props) {
  const auth = useAuth();
  const [state, dispatch] = useImmerReducer(reducer, initialState);
  const {
    settings,
    step,
    docEdo,
    isVisibleModal,
    isVisibleDismissalModal,
    sendKiasStatus,
  } = state;

  const [form] = Form.useForm();
  const [hasSurvey, setHasSurvey] = useState(false);
  const { handbookList, isLoadingHandbookList } = useHandbook("cDocClass");
  const {
    handbookList: handbookStatusList,
    isLoadingHandbookList: isLoadingStatusList,
    handbookStageList: handbookStageList,
    isLoadingHandbookStageList: isLoadingStageList,
  } = useHandbook("cDocStatus");

  const { colleaguesList, departmentList, isLoadingColleaguesList } =
    useColleagues();
  const { documentID } = useParams();
  const [access, setAccess] = useState(true);
  const [dateBeg, setDateBeg] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const setDispatchClassID = useDispatch();

  let navigate = useNavigate();

  const fetchData = async (id) => {
    try {
      dispatch({ type: "loadingSettings", payload: true });

      const { data } = await api.edo.getDocument(id);

      setDispatchClassID(addClassID(data));

      await console.log("data", data);

      // console.log('class_id', data.data.class.id);

      // Если получаем статус 403 - запрещаем просмотр документа
      setAccess(!(data.error_code === 403));

      if (data.data.class.constant1 == "cAppForDismissal") {
        const { data } = await api.edo.getSurveyData(id);
        setHasSurvey(data.data.length > 0);
      }
      if (settings.data === null) {
        const { data: settingsData } = await api.edo.getSettings({
          id: data.data.class.id,
        });
        dispatch({ type: "settings", payload: settingsData.data });
      }

      dispatch({ type: "document", payload: data.data });

      form.setFieldsValue({
        document_id: data.data.document_id,
        class_id: data.data.class.id,
        status_id: data.data.status.foreign_id,
        // TODO - удалить (не используем стадию прохождения)
        stage_id: data.data.stage.id,
        id: data.data.id,
        employee_id: data.data.employee_id.id,
        department_id: data.data.department,
        date_reg: dayjs(data.data.date_reg),
        date_end: data.data.date_end ? dayjs(data.data.date_end) : "",
        date_beg: data.data.date_beg ? dayjs(data.data.date_beg) : "",
        date_denounce: data.data.date_denounce
          ? dayjs(data.data.date_denounce)
          : "",
        client_id: data.data.client.client_id,
      });
    } catch (error) {
    } finally {
      dispatch({ type: "loadingSettings", payload: false });
    }
  };

  const handleClickPrint = () => {
    dispatch({ type: "downloadForm", payload: true });
  };

  const reSendDocument = () => {
    (async () => {
      if (state.docEdo.data?.id) {
        const { data } = await api.edo.reSendDocumentToKias(
          state.docEdo.data.id
        );
        dispatch({ type: "reSendKias", payload: !data.success });
      }
    })();
  };

  const handleDocumentSettings = () => {
    form.validateFields().then(async (values) => {
      try {
        dispatch({ type: "loadingSettings", payload: true });

        const { data } = await api.edo.getSettings({
          id: values.id,
        });

        form.setFieldsValue({
          class_id: data.data.id,
          status_id: 2516,
          stage_id: 1,
          employee_id: auth.user.data?.user_info.id,
          department_id: auth.user.data?.department?.id,
        });

        dispatch({ type: "settings", payload: data.data });
        dispatch({ type: "nextStep", payload: 2 });
      } catch (error) {
      } finally {
        dispatch({ type: "loadingSettings", payload: false });
      }
    });
  };

  const handleDocumentCreate = async (values) => {
    values.employee_id = parseInt(values.employee_id);

    try {
      const sendData = {
        // TODO на бэкенде сделать update если есть id
        id: docEdo.data?.id,
        class_id: values.class_id,
        date_reg: values.date_reg,
        date_beg: values.date_beg,
        date_end: values.date_end,
        date_denounce: values.date_denounce,
        department_id: values.department_id,
        employee_id: values.employee_id,
        // TODO - удалить (не используем стадию прохождения)
        stage_id: values.stage_id,
        status_id: values.status_id,
        client_id: parseInt(values.client_id),
      };

      const { data } = await api.edo.addDocument(sendData);

      dispatch({ type: "document", payload: data });

      form.setFieldsValue({
        document_id: data.document_id,
        stage_id: parseInt(data.stage_id),
        status_id: parseInt(data.status_id),
      });

      // setId(data.id);
      navigate(`${data.id}`);
    } catch (error) {
      let message;

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 422) {
          Object.keys(error.response.data).forEach((key) => {
            form.setFields([
              {
                name: key,
                // @ts-ignore
                errors: error.response.data[key],
              },
            ]);
          });

          return;
        }

        message = error.message;
      } else {
        message = String(error);
      }

      notification.info({
        message: "Ошибка",
        description: message,
      });
    }
  };

  function handleSubmitAttributeForm(values) {
    const sendData = Object.values(values);

    sendData.forEach((item: any) => {
      if (typeof item.number_value === "string") {
        item.number_value = parseInt(item.number_value);
      }
    });

    return api.edo.addAttribute(sendData);
  }

  function handleSubmitTabularForm(values) {
    let sendData = JSON.parse(JSON.stringify(values));

    sendData = Object.values(sendData.row_column_editor).map((item: any) => {
      const itemArray = Object.values(item);

      itemArray.forEach((item: any) => {
        if (typeof item.num_value === "string") {
          item.num_value = parseInt(item.num_value);
        }

        /**
         * При автоматической конвертации в JSON часовой пояс игнорируется,
         * дата сбивается на 1 день назад
         * Поэтому конвертируем в строку средствами dayjs
         */
        if (item.date_value && typeof item.date_value === "string") {
          if (dayjs(item.date_value).isValid()) {
            item.date_value = dayjs(item.date_value).format();
          }
        }
      });
      return Object.values(item);
    });

    return api.edo.addTabular(sendData);
  }

  function handleSubmitRemarkForm(values) {
    let sendData = JSON.parse(JSON.stringify(values));
    return api.edo.addRemark({
      document_id: values.remark.document_id,
      remark: values.remark.remark,
      remark2: values.remark2 ? values.remark2.remark2 : "",
    });
  }
  const onCancel = () => {
    window.location.reload();
    dispatch({ type: "hideModal" });
  };

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    /*
      Просмотр документа
      Получаем данные документа и настройки домукента
    */

    if (settings.data === null && documentID) {
      dispatch({ type: "nextStep", payload: 2 });
      fetchData(documentID);
    }
  }, [documentID]);

  useEffect(() => {
    if (state.downloadForm) {
      (async function downloadForm() {
        try {
          const { data } = await api.edo.getForm({
            document_id: state.docEdo.data?.id,
            document_type: "pdf",
          });

          const downloadUrl = window.URL.createObjectURL(new Blob([data]));

          const link = document.createElement("a");
          link.href = downloadUrl;
          link.setAttribute(
            "download",
            `Печатная форма ${state.docEdo.data?.document_id}.pdf`
          );
          link.click();
          link.remove();
        } catch (error) {
          console.log(error);
        } finally {
          dispatch({ type: "downloadForm", payload: false });
        }
      })();
    }
  }, [dispatch, state.downloadForm]);

  if (
    isLoadingHandbookList ||
    isLoadingStatusList ||
    isLoadingColleaguesList ||
    isLoadingStageList
  ) {
    return <CustomLoader />;
  } else {
    if (!settings.isLoading) {
      DateMask();
    }
  }
  const sendAllData = async (forms: any) => {
    try {
      const attributesForm = forms.attributes;
      const tabularForm = forms.tabular;
      const remarkForm = forms.remark;
      const remark2Form = forms.remark2;
      const documentForm = forms.documentForm;

      if (typeof remarkForm !== "undefined") {
        await handleSubmitRemarkForm({
          remark: remarkForm.getFieldsValue(),
        });
        if (typeof remark2Form !== "undefined") {
          await handleSubmitRemarkForm({
            remark: remarkForm.getFieldsValue(),
            remark2: remark2Form.getFieldsValue(),
          });
        }
      }
      if (typeof attributesForm !== "undefined") {
        const { data: dataAttributes } = await handleSubmitAttributeForm(
          attributesForm.getFieldsValue()
        );

        const attributesToSetFields = Object.fromEntries(
          dataAttributes?.map((item) => [
            `id-${item.editor_id}`,
            {
              ...item,
              date_value: dayjs(item.date_value).isValid()
                ? dayjs(item.date_value)
                : null,
            },
          ])
        );

        attributesForm.setFieldsValue(attributesToSetFields);
      }
      if (typeof tabularForm !== "undefined") {
        const { data: dataTabular } = await handleSubmitTabularForm(
          tabularForm.getFieldsValue()
        );
        const dataTabularArray = dataTabular.flat(2);

        for (
          let i = 0;
          i < tabularForm.getFieldsValue().row_column_editor.length;
          i++
        ) {
          for (const propName in tabularForm.getFieldsValue().row_column_editor[
            i
          ]) {
            const orderNo =
              tabularForm.getFieldsValue().row_column_editor[i][propName]
                .order_no;
            const displayNo =
              tabularForm.getFieldsValue().row_column_editor[i][propName]
                .display_no;

            const findElement = dataTabularArray.find(
              (item) =>
                parseInt(item.display_no) === displayNo &&
                parseInt(item.order_no) === orderNo
            );

            if (findElement) {
              Object.assign(
                tabularForm.getFieldsValue().row_column_editor[i][propName],
                {
                  id: parseInt(findElement.id),
                }
              );
              tabularForm.setFieldsValue(tabularForm.getFieldsValue());
            }
          }
        }
      }

      if (typeof documentForm !== "undefined") {
        const documentFormData = documentForm.getFieldsValue();

        const data = api.edo.updateDocumentForm({
          documentId: documentID,
          data: {
            ...documentFormData,
            date_reg:
              dayjs(documentFormData.data_reg).format("YYYY-MM-DD") +
              ":00:00.000Z",
            date_beg:
              dayjs(documentFormData.date_beg).format("YYYY-MM-DD") +
              ":00:00.000Z",
            date_end:
              dayjs(documentFormData.date_end).format("YYYY-MM-DD") +
              ":00:00.000Z",
          },
        });
      }
    } catch (error) {
      let message;

      if (axios.isAxiosError(error)) {
        message = error.message;
      } else {
        message = String(error);
      }

      notification.info({
        message: "Ошибка",
        description: message,
      });
    }
  };
  const selectBegDate = (val) => {
    setDateBeg(val);
  };
  const selectEndDate = (val) => {
    setDateEnd(val);
  };

  return access ? (
    <>
      <Form.Provider
        onFormFinish={async (name, { values, forms }) => {
          if (documentID) {
            const { data } = await api.edo.getDocument(`${documentID}`);
            if (name === "listForm") {
              Promise.all(
                Object.values(forms).map((form) => form.validateFields())
              )
                .then(async () => {
                  if (data.data.class.constant1 !== "cAppForDismissal") {
                    sendAllData(forms);
                    dispatch({ type: "showModal" });
                  } else if (
                    data.data.class.constant1 == "cAppForDismissal" &&
                    !hasSurvey
                  ) {
                    if (
                      settings.data?.form_columns &&
                      settings.data?.form_columns.length > 0
                    ) {
                      dispatch({ type: "showDismissalModal" });
                      sendAllData(forms);
                    } else {
                      dispatch({ type: "showModal" });
                    }
                  } else {
                    dispatch({ type: "showModal" });
                    sendAllData(forms);
                  }
                })
                .catch((e) => {
                  notification.info({
                    message: "Уведомление",
                    description: "Заполните обязательные поля",
                  });
                });
            }
          }
        }}
      >
        <CustomLoader spinning={settings.isLoading}>
          <Content>
            <Card>
              {step === 2 && (
                <Row gutter={[25, 25]} justify="space-between">
                  <Col>
                    <Button
                      icon={<ArrowLeftOutlined />}
                      className="mb-5"
                      onClick={() => {
                        dispatch({ type: "backStep" });
                        navigate("/document");
                        form.resetFields();
                      }}
                    >
                      Назад к списку документов
                    </Button>
                  </Col>
                  <Col>
                    <Button
                      onClick={handleClickPrint}
                      icon={<PrinterFilled />}
                      type="primary"
                      loading={state.downloadForm}
                    >
                      Печатная форма
                    </Button>
                  </Col>
                </Row>
              )}

              <Title level={5} type="secondary" className="mb-5">
                Новый документ
              </Title>
              <Form
                layout="vertical"
                name="documentForm"
                form={form}
                onFinish={handleDocumentCreate}
              >
                {step === 1 && (
                  <Row gutter={15} align="bottom">
                    <Col span={8}>
                      <Form.Item
                        label="Тип документа"
                        rules={[
                          {
                            required: true,
                            message: "Обязательное поле",
                          },
                        ]}
                        name="id"
                      >
                        <TreeSelectHandbook handbookList={handbookList} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleDocumentSettings}
                        loading={settings.isLoading}
                      >
                        Создать
                      </Button>
                    </Col>
                  </Row>
                )}

                {step === 2 && (
                  <Row gutter={15} align="bottom">
                    <Col span={8}>
                      <Form.Item
                        label="Тип документа"
                        rules={[
                          {
                            required: true,
                            message: "Обязательное поле",
                          },
                        ]}
                        name="class_id"
                      >
                        <TreeSelectHandbook
                          handbookList={handbookList}
                          disabled={true}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="ID документа" name="id" hidden>
                        <Input disabled />
                      </Form.Item>
                      <Form.Item label="Номер документа №" name="document_id">
                        <Input disabled />
                      </Form.Item>
                    </Col>
                    {/* <Col span={8}> */}
                    <Form.Item label="Статус" name="status_id" hidden noStyle>
                      <Select
                        options={handbookStatusList}
                        showSearch
                        allowClear
                        disabled
                        fieldNames={{
                          label: "full_name",
                          value: "foreign_id",
                          options: "children",
                        }}
                      />
                    </Form.Item>
                    {/* </Col> */}
                    {settings.data?.show_stage && (
                      <Col span={8}>
                        <Form.Item label="Статус" name="stage_id">
                          <Select
                            options={handbookStageList}
                            showSearch
                            allowClear
                            disabled
                            fieldNames={{
                              label: "name",
                              value: "id",
                              options: "children",
                            }}
                          />
                        </Form.Item>
                      </Col>
                    )}
                    <Col span={8}>
                      <Form.Item label="Куратор" name="employee_id">
                        <TreeSelectCollegues
                          disabled={true}
                          colleaguesList={colleaguesList}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="Подразделение" name="department_id">
                        <TreeSelectCollegues
                          disabled={true}
                          selectDepartment={true}
                          colleaguesList={departmentList}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        label="Дата регистрации"
                        name="date_reg"
                        initialValue={dayjs()}
                        required
                      >
                        <DatePicker
                          className="dateMask"
                          style={{ width: "100%" }}
                          format={"DD.MM.YYYY"}
                          // disabledDate={(current) => {
                          //   return (
                          //     dayjs().add(+1, 'days') >= current ||
                          //     dayjs().add(1, 'month') <= current
                          //   );
                          // }}
                          disabled={true}
                        />
                      </Form.Item>
                    </Col>
                    {settings.data?.show_client && (
                      <Col span={8}>
                        <Form.Item label="Контрагент" name="client_id">
                          <TreeSelectCollegues
                            disabled={!!docEdo.data}
                            colleaguesList={colleaguesList}
                          />
                        </Form.Item>
                      </Col>
                    )}
                    {settings.data?.show_period && (
                      <>
                        <Col span={8}>
                          <Form.Item
                            label="Дата начала"
                            name="date_beg"
                            rules={[
                              {
                                required: true,
                                message: "Обязательное поле",
                              },
                            ]}
                          >
                            {settings.data.id == 7808 ||
                            settings.data.id == 7809 ||
                            settings.data.id == 7810 ||
                            settings.data.id == 7811 ? (
                              <DatePicker
                                className="dateMask"
                                style={{ width: "100%" }}
                                format="DD.MM.YYYY"
                                onChange={selectBegDate}
                                disabled={!!docEdo.data}
                              />
                            ) : (
                              <DatePicker
                                className="dateMask"
                                style={{ width: "100%" }}
                                format="DD.MM.YYYY"
                                onChange={selectBegDate}
                                disabledDate={(current) => {
                                  return (
                                    dayjs(docEdo?.data?.date_reg).add(
                                      -1,
                                      "day"
                                    ) >= current
                                  );
                                }}
                                disabled={!!docEdo.data}
                              />
                            )}
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            label="Дата окончания"
                            name="date_end"
                            rules={[
                              {
                                required: true,
                                message: "Обязательное поле",
                              },
                            ]}
                          >
                            <DatePicker
                              className="dateMask"
                              style={{ width: "100%" }}
                              format="DD.MM.YYYY"
                              onChange={selectEndDate}
                              disabledDate={(current) => {
                                if (typeof dateBeg == "string") {
                                  return (
                                    dayjs(docEdo?.data?.date_reg).add(
                                      -1,
                                      "day"
                                    ) >= current
                                  );
                                } else if (
                                  dateBeg !== null ||
                                  typeof dateBeg == "object"
                                ) {
                                  return (
                                    dayjs(dateBeg).startOf("day") >
                                    dayjs(current).startOf("day")
                                  );
                                } else {
                                  return (
                                    dayjs(docEdo?.data?.date_reg).add(-2) >=
                                    current
                                  );
                                }
                              }}
                              disabled={!!docEdo.data}
                            />
                          </Form.Item>
                        </Col>
                      </>
                    )}
                    {settings.data?.show_date_denounce && (
                      <Col span={8}>
                        <Form.Item
                          label="Доср. прекращ."
                          name="date_denounce"
                          rules={[
                            {
                              required: true,
                              message: "Обязательное поле",
                            },
                          ]}
                        >
                          <DatePicker
                            className="dateMask"
                            style={{ width: "100%" }}
                            format={"DD.MM.YYYY"}
                            disabledDate={(current) => {
                              if (typeof dateBeg == "string") {
                                return (
                                  dayjs(docEdo?.data?.date_reg).add(
                                    -1,
                                    "day"
                                  ) >= current
                                );
                              } else if (
                                dateBeg !== null ||
                                typeof dateBeg == "object"
                              ) {
                                return (
                                  dayjs(dateBeg).startOf("day") >
                                  dayjs(current).startOf("day")
                                );
                              } else {
                                return (
                                  dayjs(docEdo?.data?.date_reg).add(-2) >=
                                  current
                                );
                              }
                            }}
                            disabled={!!docEdo.data}
                          />
                        </Form.Item>
                      </Col>
                    )}
                    {docEdo.data === null && (
                      <Col span={24}>
                        <Button
                          htmlType="submit"
                          type="primary"
                          disabled={!!docEdo.data}
                        >
                          Сохранить и продолжить
                        </Button>
                      </Col>
                    )}
                    {sendKiasStatus && auth.user.data.permission.is_admin && (
                      <Col span={24}>
                        <Button
                          type="primary"
                          onClick={reSendDocument}
                          loading={settings.isLoading}
                        >
                          Отправить повторно
                        </Button>
                      </Col>
                    )}
                  </Row>
                )}
              </Form>
            </Card>

            {step === 1 && (
              <div className="mt-5">
                <EdoSearch
                  handbookList={handbookList}
                  handbookStatusList={handbookStatusList}
                  handBookStageList={handbookStageList}
                  departmentList={departmentList}
                  colleaguesList={colleaguesList}
                />
              </div>
            )}

            {step === 2 && docEdo.data !== null && settings.data !== null && (
              <>
                <Outlet
                  context={{
                    docEdo,
                    settings: settings.data,
                    handbookStatusList,
                    handbookStageList,
                    handbookList,
                    colleaguesList,
                    departmentList,
                  }}
                />
              </>
            )}
          </Content>
        </CustomLoader>
      </Form.Provider>
      {settings.data?.form_columns &&
        settings.data?.form_columns.length > 0 &&
        !hasSurvey && (
          <EdoDismissalModal
            data={settings.data?.form_columns}
            visible={isVisibleDismissalModal}
            documentID={docEdo.data?.id}
            onCancel={() => dispatch({ type: "hideDismissalModal" })}
            onSend={() => dispatch({ type: "showModal" })}
          />
        )}

      <EdoAgreementModal
        colleaguesList={colleaguesList}
        handbookStatusList={handbookStatusList}
        documentID={docEdo.data?.id}
        visible={isVisibleModal}
        onCancel={onCancel}
        onSend={() => fetchData(documentID)}
      />
    </>
  ) : (
    <Result
      status="warning"
      title="У Вас нет прав для доступа к этой странице"
      extra={
        <Button type="primary" key="console" onClick={() => navigate(-1)}>
          Вернуться назад
        </Button>
      }
    />
  );
}

export default EdoPage;
