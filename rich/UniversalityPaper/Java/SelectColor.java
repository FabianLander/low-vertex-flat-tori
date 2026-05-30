import java.awt.*;
import java.awt.event.*;
import java.awt.geom.*;
import java.math.*;


public class SelectColor {
    Manager M;
    ListenSquare RR,GG,BB,TT;
    int rval,gval,bval,tval;
    Color C;
    int X,Y,W,H;
    ListenSquare MEM[][]=new ListenSquare[4][8];
    ListenSquare INFO;

    public SelectColor(Manager M,int X,int Y,int W,int H) {
	this.M=M;
	C=new Color(200,0,100,255);
	RR=new ListenSquare(0,0,0,0,null);
	GG=new ListenSquare(0,0,0,0,null);
	BB=new ListenSquare(0,0,0,0,null);
	TT=new ListenSquare(0,0,0,0,null);

	rval=200;
	gval=0;
	bval=100;
	tval=255;
	this.X=X;
	this.Y=Y;
	this.W=W;
	this.H=H;

	for(int j=0;j<4;++j) {
	for(int i=0;i<8;++i) {
	    MEM[j][i]=new ListenSquare(W-120+12*i,1+12*j,12,12,Color.white);
	    MEM[j][i].C=Color.green;
	}
	}

	MEM[3][0].C=Color.white;
	MEM[3][1].C=new Color(180,180,180);
	MEM[3][2].C=new Color(140,140,140);
	MEM[3][3].C=new Color(100,100,100);
	MEM[3][4].C=new Color(80,80,80);
	MEM[3][5].C=new Color(60,60,60);
	MEM[3][6].C=new Color(30,30,30);
	MEM[3][7].C=Color.black;

	MEM[0][0].C=new Color(255,0,0);
	MEM[0][1].C=new Color(230,100,0);
	MEM[0][2].C=new Color(255,255,0);
	MEM[0][3].C=new Color(0,200,0);
	MEM[0][4].C=new Color(50,100,255);
	MEM[0][5].C=new Color(100,0,200);
	MEM[0][6].C=new Color(200,0,100);
	MEM[0][7].C=new Color(0,200,200);

	MEM[1][0].C=new Color(160,0,0);
	MEM[1][1].C=new Color(180,70,0);
	MEM[1][2].C=new Color(160,160,0);
	MEM[1][3].C=new Color(0,130,0);
	MEM[1][4].C=new Color(0,0,255);
	MEM[1][5].C=new Color(60,0,120);
	MEM[1][6].C=new Color(120,0,60);
	MEM[1][7].C=new Color(0,100,100);

	MEM[2][0].C=new Color(100,0,0);
	MEM[2][1].C=new Color(120,40,0);
	MEM[2][2].C=new Color(60,100,0);
	MEM[2][3].C=new Color(0,60,0);
	MEM[2][4].C=new Color(0,0,170);
	MEM[2][5].C=new Color(40,0,80);
	MEM[2][6].C=new Color(80,0,40);
	MEM[2][7].C=new Color(0,60,60);

	INFO=new ListenSquare(W-12,0,12,12,Color.black);

   }


    public void render(Graphics2D g) {

      g.translate(X,Y);
      g.setColor(Color.black);
      g.fillRect(0,0,W,H);
      drawSliders(g);
      drawMemory(g);  
      g.setColor(Color.white);
      g.drawRect(0,0,W,H);
      INFO.infoRender(g);
      g.translate(-X,-Y);


    }


      public void drawSliders(Graphics2D g) {


	 double w=W-150;
         double h=.25*H;
	 RR.x=0;
	 RR.y=0;
	 RR.w=w;
	 RR.h=h;
	  RR.on=1;
	  RR.renderSmooth(g,Color.black,new Color(100,100,100));

	 GG.x=0;
	 GG.y=h;
	 GG.w=w;
	 GG.h=h; 
         GG.on=1;
         GG.renderSmooth(g,Color.black,new Color(100,100,100));

	 BB.x=0;
	 BB.y=2*h;
	 BB.w=w;
	 BB.h=h; 
         BB.on=1;
         BB.renderSmooth(g,Color.black,new  Color(100,100,100));

	 TT.x=0;
	 TT.y=3*h;
	 TT.w=w;
	 TT.h=h; 
         TT.on=1;
         TT.renderSmooth(g,new Color(40,40,40),Color.black);

	 ListenSquare SHOW=new ListenSquare(w,0,25,4*h,null);
	 SHOW.renderSmooth(g,new Color(rval,gval,bval,tval),Color.black);


	 double rh=w*rval/255.0;
	 double gh=w*gval/255.0;
	 double bh=w*bval/255.0;
	 double th=w*tval/255.0;

	 ListenSquare SRR=new ListenSquare(0,0,rh,h,null);
	 SRR.renderSmooth(g,new Color(255,0,0),new Color(0,0,0));
	 ListenSquare SGG=new ListenSquare(0,h,gh,h,null);
	 SGG.renderSmooth(g,new Color(0,255,0),new Color(0,0,0));
	 ListenSquare SBB=new ListenSquare(0,2*h,bh,h,null);
         SBB.renderSmooth(g,new Color(80,120,255),new Color(0,0,0));	 
         ListenSquare STT=new ListenSquare(0,3*h,th,h,null);
	 STT.renderSmooth(g,new Color(200,200,200),new Color(0,0,0));

      }



    public void drawMemory(Graphics2D g) {   
       for(int j=0;j<4;++j) {
       for(int i=0;i<8;++i) {
	   MEM[j][i].renderSmooth(g,MEM[j][i].C,Color.black);
       }
       }
    }




    public void  changeR(Point X) {
	double x=W-150;
	rval=(int)(X.x*255/x);
	if(x>255) x=255;
	if(x<0) x=0;
    }

   public void  changeG(Point X) {
	double x=W-150;
	gval=(int)(X.x*255/x);
	if(x>255) x=255;
	if(x<0) x=0;
    }

   public  void  changeB(Point X) {	
	double x=W-150;	
        bval=(int)(X.x*255/x);
        if(x>255) x=255;	
        if(x<0) x=0;
    }

   public void  changeT(Point X) {
	double x=W-150;
	tval=(int)(X.x*255/x);
        if(x<0) x=0;
	if(x>255) x=255;
    }

    public void process(MouseEvent e) {
       MouseData J=MouseData.process(e);
       J.X.y=J.X.y-Y;
       if(RR.inside(J.X)==1)   changeR(J.X);
       if(GG.inside(J.X)==1)   changeG(J.X);
       if(BB.inside(J.X)==1)   changeB(J.X);
       if(TT.inside(J.X)==1)   changeT(J.X);
       C=new Color(rval,gval,bval,tval);
       useMemory(J.X);
   }

    public void useMemory(Point Q) {
	for(int j=0;j<4;++j) {
	for(int i=0;i<8;++i) {
	    if(MEM[j][i].inside(Q)==1) {
                   C=MEM[j][i].C;
		   rval=MEM[j][i].C.getRed();
		   gval=MEM[j][i].C.getGreen();
		   bval=MEM[j][i].C.getBlue();
		   tval=(int)(255*MEM[j][i].C.getTransparency());
	    }
	}
	}
    }




}
