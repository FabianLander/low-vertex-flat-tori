import java.awt.event.*;
import java.awt.*;
import java.awt.geom.*;

/**Documentation file*/

public class DocumentCanvas extends ScaleCanvas implements MouseListener,MouseMotionListener {
    
    Manager M;
    String[] S=new String[500];
    String[] P=new String[500];
    int paragraphs;
    int linecount;
    String MAIN;
    Integer[] J=new Integer[200];
    SelectInteger FONT;
    ListenSquare INFO,TOP;
    int Y0,Y1;
    
    public DocumentCanvas() {
        addMouseListener(this);
        addMouseMotionListener(this);
       	Color C=new Color(50,0,100);
       	try {
       	    C=M.C.DISPLAY.M[1].C;
       	}
       	catch(Exception e) {}

	//	setBackground(C);
	// setBackground(new Color(50,0,50));
	FONT=new SelectInteger(40,3,36,18,16,10,20,1);
        for(int i=0;i<=199;++i) J[i]=Integer.valueOf(i);
        INFO=new ListenSquare(0,0,12,12);
	TOP=new ListenSquare(180,3,18,18);
        paragraphs=0;
        DocInstructions.setup(this);

	Y0=0;
	Y1=0;
    }
    
    
    
    public int wordBreak(String A,int n) {
        String AA=new String();
        for(int i=n;i>0;--i) {
            AA=A.substring(i,i+1);
            if(AA.compareTo(" ")==0) return(i);
        }
        return(n);
    }
    
    
    public void findBreaks(String A) {
        int count=0;
        int pos1=0;
        String AA=new String();
        for(int i=0;i<A.length();++i) {
            AA=A.substring(i,i+1);
            if(AA.compareTo("\n")==0) {
                P[count]=A.substring(pos1,i);
                ++count;
                pos1=i;
            }
        }
        P[count]=A.substring(pos1,A.length());
        ++count;
        paragraphs=count;
    }
    
    
    
    public void paragraphDisplay(String A,int n) {
        
        int L=A.length();
        String AA=new String();
        int pos1=0;
        int pos2=0;
        int count=0;
        int LL=L;
        while(LL>0) {
            pos2=pos1+n;
            if(pos2>=L) {
                S[count+linecount]=A.substring(pos1,L);
                LL=0;
            }
            
            if(pos2<L) {
                pos2=wordBreak(A,pos2);
                S[count+linecount]=A.substring(pos1,pos2);
                ++count;
                LL=LL-(pos2-pos1);
                pos1=pos2;
            }
        }
        linecount=linecount+count+1;
    }
    
    
    
    
    
    public void display(int n) {
        for(int i=0;i<=499;++i) S[i]="";
        findBreaks(MAIN);
        linecount=0;
        for(int i=0;i<paragraphs;++i) {
            paragraphDisplay(P[i],n);
        }
    }
    
    
    
    public void paint(Graphics gfx) {
        Graphics2D g=(Graphics2D) gfx;
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
        RenderingHints.VALUE_ANTIALIAS_ON);
	drawWords(g);
	drawControls(g);
    }


    public void drawWords(Graphics2D g) {
	g.setColor(M.C.DISPLAY.M[1].C);
	g.fillRect(0,0,getWidth(),getHeight());
	g.setColor(Color.white);
	g.translate(0,-Y1);
        g.setFont(new Font("Helvetica",Font.PLAIN,FONT.val));
        int space=FONT.val+3;
        int n=2*getWidth()/(FONT.val)-5;
	display(n);    //line width
        for(int i=0;i<=499;++i) { 
                g.drawString(S[i],5,45+space*i);
        }
	g.translate(0,Y1);
    }
    
    public void drawControls(Graphics2D g) {
	g.setColor(new Color(80,0,140));
	g.fillRect(0,0,getWidth(),25);
	g.setColor(Color.white);
	g.drawRect(0,0,getWidth(),25);
	g.drawRect(0,0,getWidth()-1,getHeight()-1); 
        FONT.render(g,new Color(0,255,255),Color.white,Color.white);
        INFO.infoRender(g); 
	TOP.render(g,new Color(0,255,255));
        g.setFont(new Font("Helvetica",Font.PLAIN,12));
	g.drawString("font size",110,17);
	g.drawString("back to top",205,17);

    }



    public void setExplain(String doc) {
	Y1=0;
	Y0=0;
        MAIN=doc;
        repaint();
    }

    public static void setText(DocumentCanvas D,String S) {
        D.setExplain(S);
        D.repaint();   
	D.Y0=0;
        D.Y1=0;
    }


    public void mousePressed(MouseEvent e) {
	MouseData J=MouseData.process(e);
	if(J.X.y>40) 	Y0=J.X.y+Y1;
    }



    public void mouseMoved(MouseEvent e) {}
    public void mouseDragged(MouseEvent e) {
	MouseData J=MouseData.process(e);
	if(J.X.y>40)   Y1=Y0-J.X.y;
	if(Y1<0) Y1=0;
	repaint();
    }


    public void mouseEntered(MouseEvent e) {}
    public void mouseReleased(MouseEvent e) {}
    public void mouseExited(MouseEvent e) {}
    public void mouseClicked(MouseEvent e) {
	MouseData J=MouseData.process(e);
	FONT.modify(J.X);
	if(INFO.inside(J.X)==1) DocInstructions.setup(this);
	if(TOP.inside(J.X)==1) {Y0=0;Y1=0;}
	repaint();
    }

    
    
}

