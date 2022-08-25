//Esse Script requer a biblioteca PDF-lib (https://pdf-lib.js.org/)
//Para adicioná-lo recomenda-se copiar o código na integra e adicioná-lo como um script .gs, para mais detalhes e instruções sobre isso, veja essa discussão no github: https://github.com/Hopding/pdf-lib/discussions/1241
//
//Este script presume a ordem de algumas respostas do formulário.
//Caso necessite, troque os índices das linhas 36, 38 e 25.
//Constantes globais
//Pasta onde ficará salvo os PDFs
const PDF_REGULAR = DriveApp.getFolderById("");
const PDF_ESPECIAL = DriveApp.getFolderById("");
//Documento referência para criar as folhas de rosto
const PDF_Template = DriveApp.getFileById("");
//pasta temporária
const TEMP_FOLDER = DriveApp.getFolderById("");
//Nome para o PDF mesclado
const mesclado = "mesclado";
//email da coordenação
const emailCoordenacao = "";
//semestre letivo
const semestre = "2022.2";

//variáveis globais
var emailAluno = "";
var nomeAluno = "";
function onFormSubmit(e) {
  //coleta as respostas
    const resposta = e.response.getItemResponses();
  // separa as respostas entre "com upload" e "sem upload"
  const files = resposta.filter((itemResponse) => itemResponse.getItem().getType().toString() === 'FILE_UPLOAD');  
  const texto = resposta.filter((itemResponse) => itemResponse.getItem().getType().toString() != 'FILE_UPLOAD');

  if (files.length > 0) {
    var pdfIds = [];
    console.log("files.length > 0");
    emailAluno = e.response.getRespondentEmail();
    console.log("email: "+emailAluno);
    nomeAluno = resposta[1].getResponse();
    console.log("nome: "+nomeAluno);
    const cpf = resposta[2].getResponse();
    console.log("cpf: "+cpf);
    

    //varre a lista de respostas sem upload, formatando para enviar no email
    var dadosPreenchidos = "";
    for (var k=0; k<texto.length;k++){
      var titulo = texto[k].getItem().getTitle();
      var respAluno = texto[k].getResponse();
      dadosPreenchidos = dadosPreenchidos + titulo + ": " + respAluno + "<br>";
    }


    const timeStamp = Utilities.formatDate(new Date(), "GMT-3", "dd/MM/yyyy-HH:mm:ss");
    //cria nova subpasta para armazenar os arquivos
    const subfolderName = "["+cpf+"] "+nomeAluno+" - "+timeStamp;
    var tipoAluno = ""+texto[0].getResponse();
    if(tipoAluno.includes("REGULAR")){
      var subfolder = PDF_REGULAR.createFolder(subfolderName);  
    }
    else{
      var subfolder = PDF_ESPECIAL.createFolder(subfolderName);
    }
    

    //define acesso da pasta para privado e compartilha com aluno.
    subfolder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
    subfolder.addViewer(emailAluno);
    subfolder.addViewers([emailAluno,emailCoordenacao]);
    var subfolderURL = "https://drive.google.com/drive/folders/" + subfolder.getId() + "?usp=sharing";

     // verifica qual opção selecionada na pergunta sobre vagas reservadas
    var escolhaVagaReservada = getSelectedChoiceIndex(e);
    //varre a lista de uploads, renomeando e movendo
    for(var i=0; i < files.length; i++){
      
      var nome = files[i].getItem().getTitle();
      var idArquivo = files[i].getResponse();
      console.log("id arquivo "+i+": "+idArquivo);
      //varre array de IDs dos arquivos
      for(var j=0; j<idArquivo.length; j++){
        
        var arquivo = DriveApp.getFileById(idArquivo[j]);
        var nomeAntigo = arquivo.getName();
        var extencao = /[^.]+$/.exec(nomeAntigo);
        extencao = "."+extencao;
        //renomeia arquivo
        if(j>0){
          //se houver mais de um arquivo, coloca numeração
          var novoNome = nome+"("+j+")"+extencao;
        }
        else{
          var novoNome = nome+extencao;
        }
        arquivo.setName(novoNome);
        console.log("Renomeou arquivo "+i);
        //move para a nova pasta
        arquivo.moveTo(subfolder);
        console.log("Moveu arquivo "+i);
        
        //verifica se o usuário escolheu a opção de aluno especial (0) ou aluno regular sem vaga reservada (1)
        if(i>0||(escolhaVagaReservada==0||escolhaVagaReservada==1)){
          if(j>0){
            //se houver mais de um arquivo, adiciona ao pdf sem gerar nova folha de rosto
            pdfIds.push(arquivo.getId());
          }
          else{
            //cria folha de rosto
            var rostoId = criarRosto(files[i].getItem().getTitle(),subfolder);
          
            pdfIds.push(rostoId);
            pdfIds.push(arquivo.getId());
          }
        }


        
        
      
      }
         
      
    }
    var status = mergeAllPDFs(pdfIds,subfolder);
    if(status){
      enviaEmail(emailAluno,emailCoordenacao,nomeAluno,subfolderURL,dadosPreenchidos);
    }
    else return;
    
  }
  else{
    console.log("nenhum arquivo encontrado. files.length<1");
  }
}


async function mergeAllPDFs(ids,pasta) {
    
  //checa a quantidade de PDFs
  const numDocs = ids.length;
  console.log("numDocs:"+numDocs);
  //cria o PDF onde será escrito os dados dos PDFs enviados
  const pdfDoc = await PDFLib.PDFDocument.create().catch((err) => { console.error("Erro ao criar PDF final: "+err); });
  console.log("pdfDoc criado ("+pdfDoc+")");

  //varre a lista de PDFs enviados, escrevendo os dados no novo PDF
  for(var i = 0; i < numDocs; i++) {
      console.log("ID do "+i+"º PDF:"+ids[i]);

      //Codifica os bytes do PDF em base64 para ser usado pela biblioteca PDF-lib
      const donorPdfBytes = Utilities.base64Encode(DriveApp.getFileById(ids[i]).getBlob().getBytes());
      console.log("tamanho do array de bytes64 do "+i+"º PDF: "+donorPdfBytes.length);

      //carrega o PDF enviado no módulo da Biblioteca PDF-lib
      var nomePDF = DriveApp.getFileById(ids[i]).getName();
      const donorPdfDoc = await PDFLib.PDFDocument.load(donorPdfBytes).catch((err) => { 
        if(err.message.includes('encrypted')){
          GmailApp.sendEmail(emailAluno, 'Ocorreu um erro no envio de seus documentos', 'ERRO: Documento PDF criptografado não suportado. \n O PDF enviado contém criptografia: \n ['+ nomePDF +'] \n Favor reenviar nova cópia sem criptografia.');
          GmailApp.sendEmail(emailCoordenacao, 'Ocorreu um erro no envio dos documentos do(a) aluno(a) '+nomeAluno+'', 'ERRO: Documento PDF criptografado não suportado. \n O PDF enviado contém criptografia: \n ['+ nomePDF +']');
        }
        console.error("Erro ao carregar PDF no módulo da lib. Nome: "+err.name+", Mensagem: "+err.message+", Stack:"+err.stack);
        return false; });
      console.log("donorPdfDoc: " +donorPdfDoc);
      //checa a quantidade de páginas do PDF
      const docLength = donorPdfDoc.getPageCount();
      console.log("quantidade de páginas: "+docLength);

      //varre as páginas copiando-as no novo PDF
      for(var k = 0; k < docLength; k++) {
          const [donorPage] = await pdfDoc.copyPages(donorPdfDoc, [k]).catch((err) => { console.error("Erro ao copiar páginas. Nome: "+err.name+", Mensagem: "+err.message+", Stack:"+err.stack); });
          console.log("Doc " + i+ ", page " + k);
          pdfDoc.addPage(donorPage);
          console.log("página adicionada");
      }
  }
  //Salva o novo PDF
  const base64Bytes = await pdfDoc.saveAsBase64().catch((err) => { console.error("Erro ao salvar dados do pdf. Nome: "+err.name+", Mensagem: "+err.message+", Stack:"+err.stack); });
  console.log("criando arquivo no drive");
  //decodifica o PDF para salvar no drive
  var data = Utilities.base64Decode(base64Bytes);
  //cria o blob (nome que o google appscript da para os dados de um arquivo)
  var blob = Utilities.newBlob(data).setName(mesclado).setContentType("application/pdf")
  //Cria um novo pdf a partir do blob na pasta dada
  pasta.createFile(blob);
  console.log("arquivo criado");
  return true;
}

function criarRosto(descricao,pastaAluno) {
  //cria um doc temporário com o template
  const newTempFile = PDF_Template.makeCopy(TEMP_FOLDER);
  const  OpenDoc = DocumentApp.openById(newTempFile.getId());
  const body = OpenDoc.getBody();
  
  
  //substitui os tokens pelas informações pertinentes
  body.replaceText("{descricao}", descricao);
  
  //salva e fecha o doc
  OpenDoc.saveAndClose();
  
  //cria o pdf a partir do template modificado
  const BLOBPDF = newTempFile.getAs(MimeType.PDF);
  const pdfFile =  pastaAluno.createFile(BLOBPDF).setName("rosto "+descricao);
  console.log("Folha de rosto criada");
  
  //deleta o doc temporário e retorna o pdf
  var file = DriveApp.getFileById(newTempFile.getId());
  file.setTrashed(true);
  return pdfFile.getId();
}

function enviaEmail(email1,email2,nomeAluno,linkPasta,dados){
  //obtém template do email a partir do arquivo html
  var html = HtmlService.createTemplateFromFile("email.html");
  var htmlText = html.evaluate().getContent();

  var assunto = "PGCC - Envio de documentação de matrícula do aluno"+" - "+ nomeAluno;
  var textBody = "Esse email requer suporte à HTML";

  htmlText = htmlText.replace(/%NomeDoAluno%/, nomeAluno);
  htmlText = htmlText.replace(/%linkDaPasta%/, linkPasta);
  htmlText = htmlText.replace(/%semestre%/, semestre);
  htmlText = htmlText.replace(/%dadosform%/, dados);

  var options = {
                htmlBody: htmlText,
                replyTo: emailCoordenacao
            };
  GmailApp.sendEmail(email1+","+email2, assunto, textBody, options);
}

function getSelectedChoiceIndex(e) {
  var form = FormApp.getActiveForm();
  var mChoiceIndex = 3; //pergunta sobre vagas reservadas, o número indica a posição (index) da pergunta!
  var formResponse = e.response;
  var itemResponses = formResponse.getItemResponses();

  var selectedChoice = itemResponses[mChoiceIndex].getResponse();
  var choices = form.getItems()[mChoiceIndex].asMultipleChoiceItem().getChoices();
  for (i = 0; i < choices.length; i++) {
    if (selectedChoice == choices[i].getValue()) {
      console.log("getSelectedChoiceIndex: "+i);
      return i;
    };
  }
  console.log("getSelectedChoiceIndex: escolha não encontrada na questão: "+itemResponses[mChoiceIndex].getItem().getTitle());
}
