import java.awt.event.*;
import java.awt.*;
import java.awt.geom.*;


public class ControlPanelColor {
    ListenSquare[] L=new ListenSquare[30];
    ListenSquare[] M=new ListenSquare[30];
    String[] S=new String[30];
    int[] state=new int[30];
    int mode=0;
    Color[] C=new Color[10];
    int count;
    String INFO;



    public ControlPanelColor() {}

    public ControlPanelColor(Color[] C,String S[], int state[],int count,Color[] COL) {
	this.C=C;
	this.S=S;
	this.state=state;
	this.mode=mode;
	this.count=count;
	for(int i=0;i<count;++i) L[i]=new ListenSquare(0,0,12,12,Color.white);
	for(int i=0;i<count;++i) M[i]=new ListenSquare(0,0,12,12,Color.white);
	for(int i=0;i<count;++i) {L[i].on=state[i];}	
	for(int i=0;i<count;++i) {M[i].on=1;M[i].C=COL[i];}	
        L[20]=new ListenSquare(0,0,0,0,null);
	INFO="";
    }






    public int switchMode(Point X) {
	int test=-1;
	for(int i=0;i<count;++i) {
	    if(L[i].inside(X)==1) test=i;
	}
	if(test!=-1) {
	    for(int i=0;i<count;++i) {
		L[i].on=0;
	    }
	    L[test].on=1;
	    mode=test;
	}	

        if(L[20].inside(X)==1) test=20;
	return(test);
    }



    public void forceMode(int test) {
	for(int i=0;i<count;++i) {
		L[i].on=0;
	}
	L[test].on=1;
	mode=test;
    }






    public void turnOff() {
       for(int i=0;i<count;++i) {
	  L[i].on=0;
       }
       mode=-1;
    }

    public int process(Point X,Color CC) {
	int test=-1;
	for(int i=0;i<count;++i) {
	    if(L[i].inside(X)==1) {test=i; L[i].on=1-L[i].on;}
	}
	for(int i=0;i<count;++i) {
	    if(M[i].inside(X)==1) {test=i;M[i].C=CC;}
	}	
        if(L[20].inside(X)==1) test=20;
	return(test);
    }


    public void render(Graphics2D g,int x,int y,int w) {

	//the frame
	g.setColor(C[0]);  //background color
	g.fillRect(x,y,w,20+15*count);
	g.setColor(C[1]);  //background color
	g.drawRect(x,y,w,20+15*count);

	//the title  
        g.setFont(new Font("Helvetica",Font.PLAIN,10));
	g.setColor(C[2]);
	g.drawString(S[count],x+3,y+12);

	//the words
	g.setColor(C[3]);   //textcolor
	for(int i=0;i<count;++i) {
	    g.drawString(S[i],x+35,y+15*i+30);
	}

	//the boxes
	for(int i=0;i<count;++i) {
	    L[i].x=x+18;
	    L[i].y=y+20+15*i;
	    M[i].x=x+3;
	    M[i].y=y+20+15*i;
	}
	for(int i=0;i<count;++i) L[i].render2(g,C[4]);
	for(int i=0;i<count;++i) M[i].render2(g,M[i].C);

	L[20].x=x+w-12;
	L[20].y=y;
	L[20].w=12;
	L[20].h=12;
	L[20].infoRender(g);
    }







}

